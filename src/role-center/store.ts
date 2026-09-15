import { withExecutiveDemo } from "./executiveDemo";
import { withProcurementDemo } from "../admin/procurementDemo";
import { useSyncExternalStore } from "react";
import {
  availableRole,
  baseDefinition,
  canApprove,
  canEdit,
  CURRENT_USER,
  currentDefinition,
  effectiveResources,
  emptyScope,
  evaluate,
  fingerprint,
  migrateDefinition,
  nextVersion,
  readyForApproval,
  RUN_FAILURE_MODES,
  seedStore,
  stamp,
  uid,
  validateDefinition,
} from "./domain";
import type { Definition, Evaluation, RoleAgent, Store, Suggestion } from "./domain";

const KEY = "comac-role-center-v3";
function migrate(saved: Store | (Store & { schema: 3 })): Store {
  const next = structuredClone(saved) as Store;
  const normalize = (definition: Definition) => {
    const migrated = migrateDefinition(definition);
    migrated.resourceIds = migrated.resourceIds.filter(
      (id) => next.resources.some((resource) => resource.id === id && resource.kind !== "model"),
    );
    return migrated;
  };
  const refreshEvaluation = (
    evaluation: Evaluation | undefined,
    definition: Definition,
  ) => {
    if (!evaluation) return;
    evaluation.fingerprint = fingerprint(definition);
    evaluation.checks = evaluation.checks.map((check) => {
      if (check.name === "岗位定义与范围完整性")
        return {
          ...check,
          detail: "名称、维护人、岗位职责、行为规则、可添加范围和工作资产均已校验",
        };
      if (check.name === "关键能力可用性")
        return {
          ...check,
          detail:
            definition.resourceIds
              .map((id) => next.resources.find((r) => r.id === id)?.name || id)
              .join("、") || "尚未配置能力",
        };
      return check;
    });
  };
  next.roles.forEach((role) => {
    if (role.draft) {
      role.draft.definition = normalize(role.draft.definition);
      refreshEvaluation(role.draft.evaluation, role.draft.definition);
    }
    if (role.published) {
      role.published.definition = normalize(role.published.definition);
      refreshEvaluation(role.published.evaluation, role.published.definition);
    }
    role.versions.forEach((version) => {
      version.definition = normalize(version.definition);
      refreshEvaluation(version.evaluation, version.definition);
    });
  });
  next.approvals.forEach((approval) => {
    if (approval.definition) {
      approval.definition = normalize(approval.definition);
      refreshEvaluation(approval.evaluation, approval.definition);
    }
  });
  next.runs.forEach((run) => {
    if (run.cause === "SOP 不适用") run.cause = "能力地图不适用";
    // 失败模式细分：历史 store 里的统一根因收敛到细分口径（与种子共用 RUN_FAILURE_MODES）
    const mode = RUN_FAILURE_MODES[run.id];
    if (mode && run.feedback === "bad") {
      run.cause = mode.cause;
      run.evidence = mode.evidence;
      run.attribution = mode.attribution;
    }
  });
  next.suggestions.forEach((suggestion) => {
    if (suggestion.type === "SOP") suggestion.type = "能力地图";
    suggestion.title = suggestion.title.replaceAll("SOP", "能力地图");
    suggestion.issue = suggestion.issue.replaceAll("SOP", "能力地图");
    suggestion.proposed = suggestion.proposed.replaceAll("SOP", "能力地图");
  });
  next.audit.forEach((entry) => {
    entry.detail = entry.detail
      .replaceAll("岗位说明", "岗位摘要")
      .replaceAll("SOP", "能力地图");
  });
  // 成长曲线曾把重复操作也记成成长点，按「同日 + 同标题 + 同说明」把历史数据收敛掉
  const seenGrowth = new Set<string>();
  next.growth = next.growth.filter((item) => {
    const dedupeKey = `${item.at.slice(0, 10)}|${item.title}|${item.detail}`;
    if (seenGrowth.has(dedupeKey)) return false;
    seenGrowth.add(dedupeKey);
    return true;
  });
  next.schema = 4;
  return withExecutiveDemo(withProcurementDemo(next));
}
function load(): Store {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (
      (saved?.schema === 3 || saved?.schema === 4) &&
      Array.isArray(saved.roles) &&
      Array.isArray(saved.people) &&
      Array.isArray(saved.runs)
    ) {
      const migrated = migrate(saved);
      if (JSON.stringify(saved) !== JSON.stringify(migrated))
        localStorage.setItem(KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch {
    /* Keep a usable session if browser storage is unavailable. */
  }
  return withExecutiveDemo(withProcurementDemo(seedStore()));
}
let state = load();
const listeners = new Set<() => void>();
export const getStore = () => state;
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
export function useRoleStore() {
  return useSyncExternalStore(subscribe, getStore, getStore);
}
window.addEventListener("storage", (event) => {
  if (event.key === KEY) {
    state = load();
    listeners.forEach((fn) => fn());
  }
});
function transaction<T>(fn: (store: Store) => T): T {
  const next = structuredClone(state);
  const result = fn(next);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    throw new Error("保存失败，浏览器存储空间不足。请先下载较大的附件后重试。");
  }
  state = next;
  listeners.forEach((listener) => listener());
  return result;
}
function required(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
function roleIn(store: Store, id: string) {
  const role = store.roles.find((r) => r.id === id);
  required(role, "岗位智能体不存在");
  return role;
}
function editPermission(store: Store) {
  required(canEdit(store), "当前身份没有资源维护权限");
}
function audit(
  store: Store,
  action: string,
  detail: string,
  role?: RoleAgent,
  by = store.adminId,
) {
  store.audit.unshift({
    id: uid("audit"),
    roleId: role?.id,
    version: role?.draft?.version || role?.published?.version,
    action,
    detail,
    by,
    at: stamp(),
  });
  if (role) role.updatedAt = stamp();
}
/**
 * 记一个成长点。
 *
 * 成长曲线的语义是「岗位 / 能力 / 画像 / 知识**发生了补齐**」，
 * 不是操作日志 —— 同一天里标题与说明都一样的重复操作，只算一个成长点。
 * 否则反复点「重新评测」这类动作会堆出一串完全相同的事件。
 */
function growth(
  store: Store,
  title: string,
  detail: string,
  type = "岗位智能体",
) {
  const at = stamp();
  const day = at.slice(0, 10);
  const duplicated = store.growth.some(
    (item) =>
      item.at.slice(0, 10) === day &&
      item.title === title &&
      item.detail === detail,
  );
  if (duplicated) return;
  store.growth.unshift({
    id: uid("growth"),
    userId: CURRENT_USER,
    at,
    title,
    detail,
    type,
  });
}
function ensureDraft(role: RoleAgent) {
  if (!role.draft)
    role.draft = {
      version: nextVersion(role),
      status: "草稿",
      definition: structuredClone(currentDefinition(role)),
      suggestionIds: [],
    };
  required(role.draft.status === "草稿", "请先撤回评测或审批，再修改草稿");
  return role.draft;
}
function pendingApproval(store: Store, roleId: string) {
  return store.approvals.find(
    (a) => a.roleId === roleId && a.status === "待审批",
  );
}
function rememberEvaluation(role: RoleAgent) {
  const evaluation = role.draft?.evaluation;
  if (!evaluation) return;
  role.evaluations = [
    { ...structuredClone(evaluation), version: role.draft!.version },
    ...(role.evaluations || []).filter((e) => e.id !== evaluation.id),
  ];
}
export const actions = {
  profileGrowth(title: string) {
    transaction((s) =>
      growth(s, title, "个人画像、知识或评测记录已更新。", "岗位画像"),
    );
  },
  setAdmin(id: string) {
    transaction((s) => {
      required(
        s.people.some((p) => p.id === id && p.active && p.role !== "user"),
        "无效的工作身份",
      );
      s.adminId = id;
    });
  },
  create(
    name: string,
    owner: string,
    scope: Definition["scope"],
    copyId?: string,
    initialDefinition?: Definition,
  ) {
    return transaction((s) => {
      editPermission(s);
      const original = copyId ? roleIn(s, copyId) : undefined;
      const definition = initialDefinition
        ? structuredClone(initialDefinition)
        : original
        ? structuredClone(currentDefinition(original))
        : {
            ...baseDefinition(name, owner),
            resourceIds: [],
            responsibilities: "",
            capabilityMap: [],
            knowledgeMap: [],
            permissionRules: "",
            templates: [],
            tests: [],
          };
      Object.assign(definition, { name: name.trim(), owner, scope });
      const errors = validateDefinition(s, definition);
      required(!errors.length, errors.join("；"));
      const role: RoleAgent = {
        id: uid("role"),
        disabled: false,
        versions: [],
        updatedAt: stamp(),
        draft: {
          version: "V0.1",
          status: "草稿",
          definition,
          suggestionIds: [],
        },
      };
      s.roles.unshift(role);
      audit(
        s,
        original ? "复制岗位智能体" : "新建岗位智能体",
        original
          ? `由“${currentDefinition(original).name}”复制工作内容，重新配置可添加范围`
          : "创建 V0.1 草稿",
        role,
      );
      return role.id;
    });
  },
  save(id: string, definition: Definition) {
    transaction((s) => {
      editPermission(s);
      const role = roleIn(s, id);
      required(
        role.draft?.status === "草稿",
        "已发布和审核中的版本不可直接修改",
      );
      const errors = validateDefinition(s, definition, id);
      required(!errors.length, errors.join("；"));
      role.draft.definition = structuredClone(definition);
      role.draft.evaluation = undefined;
      role.draft.rejection = undefined;
      audit(s, "保存草稿", "更新岗位摘要、能力与工作资产", role);
    });
  },
  newDraft(id: string) {
    transaction((s) => {
      editPermission(s);
      const role = roleIn(s, id);
      required(!role.draft, "已有待处理版本，请先完成当前草稿");
      ensureDraft(role);
      audit(
        s,
        "创建新版本",
        `${role.draft!.version} 基于 ${role.published?.version || "空白内容"} 创建`,
        role,
      );
    });
  },
  deleteDraft(id: string) {
    transaction((s) => {
      editPermission(s);
      const role = roleIn(s, id);
      required(role.draft?.status === "草稿", "只能删除草稿");
      audit(
        s,
        "删除草稿",
        `删除 ${role.draft.version}，保留所有历史审计`,
        role,
      );
      if (role.published) role.draft = undefined;
      else s.roles = s.roles.filter((r) => r.id !== id);
    });
  },
  startEvaluation(id: string) {
    transaction((s) => {
      editPermission(s);
      const role = roleIn(s, id);
      required(role.draft?.status === "草稿", "仅草稿可发起评测");
      const errors = validateDefinition(s, role.draft.definition, id, true);
      required(!errors.length, errors.join("；"));
      role.draft.status = "评测中";
      role.draft.evaluation = evaluate(s, role);
      rememberEvaluation(role);
      audit(
        s,
        "发起评测",
        `完成规则与能力校验，${role.draft.evaluation.cases.length} 条用例待复核`,
        role,
      );
    });
  },
  review(id: string, note: string, passed: boolean) {
    transaction((s) => {
      editPermission(s);
      const role = roleIn(s, id);
      const d = role.draft;
      required(d?.status === "评测中" && d.evaluation, "请先发起评测");
      required(note.trim().length >= 5, "请填写至少 5 个字的复核意见");
      if (passed) {
        required(
          d.evaluation.checks.every((c) => c.passed),
          "存在未通过的自动校验，不能确认通过",
        );
        d.evaluation.review = { by: s.adminId, at: stamp(), note: note.trim() };
      } else {
        d.evaluation.review = undefined;
        d.status = "草稿";
        d.rejection = note.trim();
      }
      rememberEvaluation(role);
      audit(s, passed ? "人工复核通过" : "人工复核不通过", note.trim(), role);
    });
  },
  trial(id: string, prompt: string) {
    return transaction((s) => {
      const role = roleIn(s, id);
      required(prompt.trim().length >= 5, "请输入具体的试运行任务");
      required(!role.disabled, "岗位已停用");
      const d = currentDefinition(role);
      const output = `任务：${prompt.trim()}\n\n处理步骤\n${d.capabilityMap.map((a) => `${a.name}\n${a.content}`).join("\n\n")}\n\n交付结构\n${d.templates.map((a) => `${a.name}\n${a.content}`).join("\n\n")}\n\n待确认事项\n${d.permissionRules}`;
      if (role.draft?.evaluation && role.draft.status === "评测中")
        role.draft.evaluation.trial = { prompt: prompt.trim(), output };
      rememberEvaluation(role);
      audit(s, "试运行", "依据当前能力地图与输出模板生成任务执行预案", role);
      return output;
    });
  },
  submit(id: string) {
    transaction((s) => {
      editPermission(s);
      const role = roleIn(s, id);
      required(readyForApproval(role), "请先完成评测并通过人工复核");
      const d = role.draft!;
      required(
        !validateDefinition(s, d.definition, id, true).length,
        "岗位配置或能力状态已变化，请重新评测",
      );
      d.status = "待审批";
      d.submitter = s.adminId;
      const approval = {
        id: uid("AP"),
        roleId: id,
        version: d.version,
        title: `${d.definition.name} ${d.version}`,
        baseVersion: role.published?.version || "",
        submitter: s.adminId,
        at: stamp(),
        status: "待审批" as const,
        definition: structuredClone(d.definition),
        evaluation: structuredClone(d.evaluation),
      };
      s.approvals.unshift(approval);
      audit(s, "提交审批", `审批单 ${approval.id}`, role);
    });
  },
  withdraw(id: string) {
    transaction((s) => {
      editPermission(s);
      const role = roleIn(s, id);
      required(
        role.draft && role.draft.status !== "草稿",
        "当前没有可撤回的评测或审批",
      );
      const approval = pendingApproval(s, id);
      if (approval) {
        approval.status = "已撤回";
        approval.resolvedAt = stamp();
        approval.note = "提交方撤回";
      }
      role.draft.status = "草稿";
      rememberEvaluation(role);
      role.draft.evaluation = undefined;
      audit(s, "撤回至草稿", "撤回后需重新评测和提交审批", role);
    });
  },
  decide(approvalId: string, approve: boolean, note: string) {
    transaction((s) => {
      const a = s.approvals.find((a) => a.id === approvalId);
      required(a?.status === "待审批", "该审批已处理");
      required(note.trim().length >= 5, "请填写至少 5 个字的审批意见");
      const role = a.roleId ? roleIn(s, a.roleId) : undefined;
      required(
        canApprove(s, a.submitter, role?.draft?.definition.owner),
        "提交人和维护人不能审批自己的版本；请由独立审批人处理",
      );
      if (role) {
        const d = role.draft;
        required(
          d?.status === "待审批" && d.version === a.version,
          "审批版本已变化，请刷新",
        );
        if (approve) {
          const errors = validateDefinition(s, d.definition, role.id, true);
          required(!errors.length, errors.join("；"));
          required(
            d.evaluation?.review &&
              d.evaluation.fingerprint === fingerprint(d.definition),
            "评测证据已失效",
          );
          required(
            d.evaluation.checks.every((c) => c.passed) &&
              d.evaluation.cases.every((c) => c.passed),
            "评测存在失败项",
          );
          const version = role.versions.length ? d.version : "V1.0";
          const published = {
            version,
            definition: structuredClone(d.definition),
            publishedAt: stamp(),
            publishedBy: s.adminId,
            evaluation: structuredClone(d.evaluation),
            approvalId: a.id,
            note: note.trim(),
          };
          role.published = published;
          role.versions.unshift(structuredClone(published));
          role.disabled = false;
          s.suggestions
            .filter((v) => d.suggestionIds.includes(v.id))
            .forEach((v) => {
              v.status = "已发布";
              v.draftVersion = version;
              v.handledAt = stamp();
            });
          role.draft = undefined;
          audit(s, "审批通过并发布", `${version} · ${note.trim()}`, role);
          growth(
            s,
            `${published.definition.name}更新至 ${version}`,
            "新发布版本已生效，进行中的任务继续使用原版本。",
          );
        } else {
          d.status = "草稿";
          d.rejection = note.trim();
          d.evaluation = undefined;
          audit(s, "审批驳回", note.trim(), role);
        }
      } else if (approve && a.resourceId && a.userId) {
        const personal = s.personal[a.userId] || {
          ids: [],
          disabled: [],
          grants: [],
        };
        personal.grants = [...new Set([...personal.grants, a.resourceId])];
        personal.ids = [...new Set([...personal.ids, a.resourceId])];
        s.personal[a.userId] = personal;
        audit(s, "访问授权通过", a.title);
      }
      a.status = approve ? "已通过" : "已驳回";
      a.reviewer = s.adminId;
      a.note = note.trim();
      a.resolvedAt = stamp();
    });
  },
  disable(id: string, reason: string, handling: string) {
    transaction((s) => {
      required(
        s.people.find((p) => p.id === s.adminId)?.role === "sys_admin",
        "停用需要平台管理员权限",
      );
      const role = roleIn(s, id);
      required(role.published && !role.disabled, "当前没有可停用的发布版本");
      required(
        reason.trim() && handling,
        "请填写停用原因并选择进行中任务处理方式",
      );
      role.disabled = true;
      if (handling === "中止进行中任务")
        s.runs
          .filter(
            (r) =>
              r.status === "进行中" &&
              r.role_contexts.some((c) => c.roleId === id),
          )
          .forEach((r) => {
            r.status = "已中止";
            r.output += "\n岗位智能体已被管理员停用。";
          });
      audit(s, "停用岗位智能体", `${reason.trim()}；${handling}`, role);
    });
  },
  restore(id: string, version: string, reason: string) {
    transaction((s) => {
      required(
        s.people.find((p) => p.id === s.adminId)?.role === "sys_admin",
        "恢复或回滚需要平台管理员权限",
      );
      const role = roleIn(s, id);
      const v = role.versions.find((v) => v.version === version);
      required(v, "历史发布版本不存在");
      required(reason.trim().length >= 5, "请填写至少 5 个字的变更原因");
      const errors = validateDefinition(s, v.definition, id, true);
      required(!errors.length, errors.join("；"));
      role.published = structuredClone(v);
      role.disabled = false;
      audit(s, "恢复发布版本", `${version} · ${reason.trim()}`, role);
    });
  },
  member(id: string, action: "add" | "toggle" | "remove") {
    transaction((s) => {
      const role = roleIn(s, id);
      const members = s.memberships[CURRENT_USER] || [];
      const m = members.find((m) => m.roleId === id);
      if (action === "remove") {
        required(m, "尚未添加此岗位");
        s.memberships[CURRENT_USER] = members.filter((m) => m.roleId !== id);
      } else {
        required(
          availableRole(s, role),
          "当前岗位已不可用，请检查发布状态或人员范围",
        );
        if (action === "add") {
          required(!m, "该岗位已添加");
          members.push({ roleId: id, enabled: true, addedAt: stamp() });
        } else {
          required(m, "尚未添加此岗位");
          m.enabled = !m.enabled;
        }
        s.memberships[CURRENT_USER] = members;
      }
      growth(
        s,
        `${action === "add" ? "添加" : action === "remove" ? "移除" : m?.enabled ? "启用" : "停用"}${role.published?.definition.name || currentDefinition(role).name}`,
        "已更新个人数字分身的岗位上下文与可用能力集合。",
      );
    });
  },
  personal(id: string, action: "add" | "toggle" | "remove") {
    transaction((s) => {
      const r = s.resources.find((r) => r.id === id);
      required(r, "资源不存在");
      const p = s.personal[CURRENT_USER] || {
        ids: [],
        disabled: [],
        grants: [],
      };
      if (action !== "remove") required(r.active, "资源已停用");
      if (action === "add") p.ids = [...new Set([...p.ids, id])];
      if (action === "toggle")
        p.disabled = p.disabled.includes(id)
          ? p.disabled.filter((x) => x !== id)
          : [...p.disabled, id];
      if (action === "remove") {
        p.ids = p.ids.filter((x) => x !== id);
        p.disabled = p.disabled.filter((x) => x !== id);
      }
      s.personal[CURRENT_USER] = p;
      growth(
        s,
        `${action === "add" ? "添加" : action === "remove" ? "移除" : p.disabled.includes(id) ? "停用" : "启用"}${r.name}`,
        "个人能力配置已更新。",
        r.kind === "skill" ? "技能" : r.kind === "mcp" ? "MCP" : "专家",
      );
    });
  },
  requestAccess(id: string) {
    transaction((s) => {
      const r = s.resources.find((r) => r.id === id);
      required(r?.restricted, "该资源无需额外授权");
      required(
        !s.approvals.some(
          (a) =>
            a.resourceId === id &&
            a.userId === CURRENT_USER &&
            a.status === "待审批",
        ),
        "该访问申请正在审批中",
      );
      s.approvals.unshift({
        id: uid("AP"),
        resourceId: id,
        userId: CURRENT_USER,
        title: `${r.name}访问申请`,
        version: r.version,
        submitter: CURRENT_USER,
        at: stamp(),
        status: "待审批",
      });
      growth(
        s,
        `申请${r.name}访问权限`,
        "已提交审批，批准后才能调用。",
        "权限",
      );
    });
  },
  resourceState(id: string, active: boolean) {
    transaction((s) => {
      editPermission(s);
      const r = s.resources.find((r) => r.id === id);
      required(r, "资源不存在");
      r.active = active;
      audit(s, active ? "启用资源" : "停用资源", r.name);
    });
  },
  feedback(id: string, feedback: "good" | "bad", cause = "") {
    transaction((s) => {
      const run = s.runs.find((r) => r.id === id && r.userId === CURRENT_USER);
      required(run, "运行记录不存在");
      required(feedback !== "bad" || cause, "请选择问题原因");
      run.feedback = feedback;
      run.cause = feedback === "bad" ? cause : "";
      run.attribution = "用户反馈 · 待维护人复核";
      if (feedback === "bad")
        for (const context of run.role_contexts) {
          const logs = s.runs.filter(
            (r) =>
              r.feedback === "bad" &&
              r.cause === cause &&
              r.taskType === run.taskType &&
              r.role_contexts.some(
                (c) =>
                  c.roleId === context.roleId && c.version === context.version,
              ) &&
              Math.abs(new Date(run.at).getTime() - new Date(r.at).getTime()) <=
                30 * 86400000,
          );
          if (
            logs.length >= 3 &&
            !s.suggestions.some(
              (v) =>
                v.roleId === context.roleId &&
                v.version === context.version &&
                v.logIds.some((id) => logs.some((l) => l.id === id)),
            )
          )
            s.suggestions.unshift({
              id: uid("suggest"),
              roleId: context.roleId,
              version: context.version,
              title: `完善${run.taskType}的${cause === "个人知识不足" ? "资料澄清指引" : cause + "检查"}`,
              type: "SOP",
              risk: "中",
              issue: `近 30 天同类任务出现 ${logs.length} 次“${cause}”反馈。`,
              proposed:
                cause === "个人知识不足"
                  ? "增加资料缺口追问与个人补充指引，不收集个人知识正文。"
                  : `在任务执行前增加“${cause}”检查项，明确核验步骤、异常处理和人工确认条件。`,
              logIds: logs.map((l) => l.id),
              status: "待处理",
              createdAt: stamp(),
            });
        }
    });
  },
  suggestionCreate(
    roleId: string,
    logIds: string[],
    title: string,
    proposed: string,
    type: string,
  ) {
    transaction((s) => {
      editPermission(s);
      const role = roleIn(s, roleId);
      required(
        title.trim().length >= 5 && proposed.trim().length >= 10,
        "请补全建议标题与具体修改内容",
      );
      required(logIds.length, "请选择至少一条脱敏运行证据");
      const logs = s.runs.filter(
        (r) =>
          logIds.includes(r.id) &&
          r.role_contexts.some((c) => c.roleId === roleId),
      );
      required(logs.length === logIds.length, "证据记录不属于当前岗位");
      const versions = [
        ...new Set(
          logs.flatMap((r) =>
            r.role_contexts
              .filter((c) => c.roleId === roleId)
              .map((c) => c.version),
          ),
        ),
      ];
      required(versions.length === 1, "请使用同一岗位版本的证据建立建议");
      s.suggestions.unshift({
        id: uid("suggest"),
        roleId,
        version: versions[0],
        title: title.trim(),
        type,
        risk: "中",
        issue: `维护人基于 ${logs.length} 条脱敏记录提出优化。`,
        proposed: proposed.trim(),
        logIds,
        status: "待处理",
        createdAt: stamp(),
      });
      audit(s, "新建进化建议", title.trim(), role);
    });
  },
  handleSuggestion(
    id: string,
    accept: boolean,
    reason: string,
    target: string,
    resourceId?: string,
  ) {
    transaction((s) => {
      editPermission(s);
      const suggestion = s.suggestions.find((v) => v.id === id);
      required(suggestion?.status === "待处理", "该建议已处理");
      required(reason.trim().length >= 5, "请填写至少 5 个字的处理意见");
      const role = roleIn(s, suggestion.roleId);
      if (accept) {
        const d = ensureDraft(role);
        const content = suggestion.proposed;
        if (target === "能力包") {
          required(
            resourceId &&
              s.resources.some((r) => r.id === resourceId && r.active),
            "请选择有效的能力资源",
          );
          required(
            !d.definition.resourceIds.includes(resourceId),
            "该资源已在能力包中，请选择需要补充的资源",
          );
          d.definition.resourceIds.push(resourceId);
        } else if (target === "能力地图" || target === "SOP")
          d.definition.capabilityMap.push({
            id: uid("sop"),
            name: suggestion.title,
            content,
          });
        else if (target === "模板")
          d.definition.templates.push({
            id: uid("tpl"),
            name: suggestion.title,
            content,
          });
        else if (target === "评测用例")
          d.definition.tests.push({
            id: uid("test"),
            name: suggestion.title,
            content: `输入：${suggestion.issue}\n预期：${content}`,
            redline: false,
          });
        else {
          required(
            ["岗位定义", "岗位职责", "规则", "行为规则"].includes(target),
            "请选择有效的修改落点",
          );
          if (target === "岗位定义" || target === "岗位职责")
            d.definition.responsibilities += `\n\n## ${suggestion.title}\n${content}`;
          else d.definition.permissionRules += `\n\n- ${suggestion.title}：${content}`;
        }
        d.suggestionIds.push(id);
        d.evaluation = undefined;
        suggestion.status = "已采纳";
        suggestion.draftVersion = d.version;
        suggestion.target = target;
      } else suggestion.status = "已拒绝";
      suggestion.reason = reason.trim();
      suggestion.handledAt = stamp();
      suggestion.by = s.adminId;
      audit(
        s,
        accept ? "采纳进化建议" : "拒绝进化建议",
        `${suggestion.title} · ${reason.trim()}`,
        role,
      );
    });
  },
  run(prompt: string) {
    return transaction((s) => {
      required(prompt.trim().length >= 5, "请输入至少 5 个字的具体任务");
      const enabled = effectiveResources(s).filter((r) => r.enabled);
      const roles = (s.memberships[CURRENT_USER] || [])
        .filter((m) => m.enabled)
        .map((m) => s.roles.find((r) => r.id === m.roleId))
        .filter((r): r is RoleAgent => !!r && availableRole(s, r));
      const contexts = roles.map((r) => ({
        roleId: r.id,
        name: r.published!.definition.name,
        version: r.published!.version,
        resourceIds: r.published!.definition.resourceIds.filter((id) =>
          enabled.some((x) => x.id === id),
        ),
      }));
      const output = `# 任务执行预案\n${prompt.trim()}\n\n## 执行步骤\n${
        roles
          .flatMap((r) => r.published!.definition.capabilityMap.map((a) => a.content))
          .filter((v, i, a) => a.indexOf(v) === i)
          .join("\n\n") ||
        "1. 明确目标和验收标准。\n2. 核对资料与权限。\n3. 整理成果并提交确认。"
      }\n\n## 输出结构\n${
        roles
          .flatMap((r) =>
            r.published!.definition.templates.map((a) => a.content),
          )
          .filter((v, i, a) => a.indexOf(v) === i)
          .join("\n\n") || "- 任务结论\n- 依据与风险\n- 后续行动"
      }\n\n## 待补充\n请补充项目资料、截止时间和验收负责人。业务数据未经查询核验，不生成事实性结论。`;
      const id = uid("RUN");
      s.runs.unshift({
        id,
        userId: CURRENT_USER,
        at: stamp(),
        summary: "岗位工作任务准备",
        taskType: "任务准备",
        source: "数字分身工作台",
        status: "待补充资料",
        role_contexts: contexts,
        feedback: null,
        cause: "",
        evidence: "已依据岗位工作方法形成执行预案，等待补充资料后继续。",
        messages: [
          { role: "用户", text: prompt.trim() },
          { role: "数字分身", text: output },
        ],
        output,
        attribution: "尚无问题反馈",
      });
      return id;
    });
  },
  exportAudit(detail: string, roleId?: string) {
    transaction((s) => {
      audit(
        s,
        "导出记录",
        detail,
        roleId ? s.roles.find((r) => r.id === roleId) : undefined,
      );
    });
  },
};
export function governanceProjection(
  run: Store["runs"][number],
  store = state,
) {
  const person = store.people.find((p) => p.id === run.userId);
  return {
    id: run.id,
    at: run.at,
    summary: run.summary,
    taskType: run.taskType,
    source: run.source,
    status: run.status,
    anonymousUser: `用户 ${String(store.people.findIndex((p) => p.id === run.userId) + 1).padStart(3, "0")}`,
    organization: person?.org,
    role_contexts: run.role_contexts,
    feedback: run.feedback,
    cause: run.cause,
    evidence: run.evidence,
    attribution: run.attribution,
  };
}
export function download(
  name: string,
  content: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export type { Definition, RoleAgent, Store, Suggestion };
export { emptyScope };
