import { useFeedback } from "../role-center/feedback";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  CircleCheck,
  Database,
  Download,
  GraduationCap,
  History,
  Pencil,
  Plug,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { A2AConversation } from "../assistant/a2aConversationTypes";
import "./digital-twin.css";
import "./assessment.css";
import "./assessment-modal.css";
import "./profile-markdown.css";
import PersonalRoles, {
  PersonalCapabilities,
} from "../role-center/PersonalRoles";
import { PersonalLogs } from "../role-center/Governance";
import PersonalKnowledge from "../role-center/PersonalKnowledge";
import { actions, download, useRoleStore } from "../role-center/store";
import {
  CURRENT_USER,
  availableRole,
  effectiveResources,
} from "../role-center/domain";
import {
  Badge,
  Confirm,
  Dialog,
  Notice,
  Empty,
  Markdown,
} from "../role-center/ui";

type ProfileTab = "mind" | "goals";
type ResourceTab = "experts" | "skills" | "mcp" | "libraries";
type TaskStatus = "doing" | "confirm" | "done";
type Task = {
  id: string;
  conversationId: string;
  title: string;
  kind: string;
  status: TaskStatus;
  owner: string;
  people: string[];
  update: string;
  detail: string;
};
type Event = {
  id: string;
  date: string;
  time: string;
  type: string;
  title: string;
  summary: string;
  source: string;
  operator: string;
  detail: string;
};
const profileTabs: [ProfileTab, string, string][] = [
  ["mind", "工作画像", "决策方法与表达偏好"],
  ["goals", "目标", "目标、口径与验收标准"],
];
const defaultProfileMarkdown: Record<ProfileTab, string> = {
  mind: "# 心智模型\n先验证，再动手。先查制度、Skill 和历史案例，再形成判断。\n\n# 决策启发式\n验收口径优先。需求不完整时先确认验收目标和不可妥协边界。\n\n# 表达 DNA\n结论先行，依据随后；用清晰、可追溯的方式表达。\n\n# 价值观与反模式\n坚持可追溯，避免无依据猜测；被指出错误时直接修正。\n\n# 诚实边界\n数据不足时明确指出缺口，并给出可执行的核验路径。",
  goals:
    "# 方案交付率\n- 目标：不低于 90%。\n- 口径：按期完成并通过验收的方案数量 / 计划交付方案数量。\n\n# 客户满意度\n- 目标：不低于 4.5 分。\n- 口径：项目阶段性满意度调研平均分。\n\n# 评审通过率\n- 目标：不低于 95%。\n- 口径：一次评审通过的方案数量 / 参加评审的方案数量。",
};
const resourceTabs: [ResourceTab, string][] = [
  ["experts", "专家"],
  ["skills", "技能"],
  ["mcp", "MCP"],
  ["libraries", "知识库"],
];
const events: Event[] = [
  {
    id: "e1",
    date: "2026-09-03",
    time: "09:20",
    type: "技能",
    title: "新增技能“方案文档生成”",
    summary: "已装配组织标准方案模板与评审检查规则。",
    source: "技能中心",
    operator: "张三",
    detail: "技能已通过可用性检查，可在权限范围内生成方案初稿和评审材料。",
  },
  {
    id: "e2",
    date: "2026-09-03",
    time: "08:45",
    type: "记忆",
    title: "确认一条用户偏好",
    summary: "正式汇报默认采用“结论先行、依据随后”的表达结构。",
    source: "女娲访谈",
    operator: "张三",
    detail: "该偏好将作为对话和文档生成时的默认表达规则。",
  },
  {
    id: "e3",
    date: "2026-09-02",
    time: "16:30",
    type: "岗位画像",
    title: "更新岗位说明",
    summary: "补充方案评审后的交付上下文移交职责。",
    source: "组织岗位库",
    operator: "市场与营销部管理员",
    detail: "岗位说明书已更新到 v2.4，数字分身下次会话将使用新边界。",
  },
  {
    id: "e4",
    date: "2026-09-02",
    time: "14:10",
    type: "规则",
    title: "同步公共岗位规则",
    summary: "对外材料发送前确认规则已同步。",
    source: "企业制度库",
    operator: "系统同步",
    detail: "本次同步包含数据脱敏与对外发送确认两项强制规则。",
  },
  {
    id: "e5",
    date: "2026-09-01",
    time: "11:15",
    type: "知识库",
    title: "新增知识库连接",
    summary: "已连接“个人项目经验”资源，权限仅限本人。",
    source: "知识库连接",
    operator: "张三",
    detail: "连接后可检索已确认的项目材料、历史决策与工作输出。",
  },
  {
    id: "e6",
    date: "2026-09-01",
    time: "10:05",
    type: "技能",
    title: "启用技能“评审检查”",
    summary: "将完整性、可交付性、依据与风险检查纳入默认流程。",
    source: "技能中心",
    operator: "张三",
    detail: "技能启用后可在方案评审任务中被自动建议调用。",
  },
  {
    id: "e7",
    date: "2026-08-30",
    time: "17:40",
    type: "记忆",
    title: "更新一条长期记忆",
    summary: "记录当前型号项目的关键协同节奏与验收口径。",
    source: "对话确认",
    operator: "张三",
    detail: "该记忆已作为长期有效工作上下文保存。",
  },
  {
    id: "e8",
    date: "2026-08-29",
    time: "15:00",
    type: "访谈",
    title: "完成一次女娲访谈",
    summary: "形成“先验证、再动手”的决策启发式初稿。",
    source: "女娲蒸馏",
    operator: "张三",
    detail: "访谈结果已本人确认，纳入用户心智。",
  },
];
function taskFrom(c: A2AConversation): Task {
  const status: TaskStatus =
    c.status === "waiting_user_confirmation"
      ? "confirm"
      : c.status === "waiting_replies" || c.status === "response_received"
        ? "doing"
        : "done";
  const speaker =
    c.members[Math.min(c.repliedCount, Math.max(c.members.length - 1, 0))];
  return {
    id: `t-${c.id}`,
    conversationId: c.id,
    title: c.title,
    status,
    kind: `${c.scope === "group" ? "多人" : "单人"}${c.mechanism === "collaboration" ? "协作" : "通知"}`,
    owner:
      status === "doing" && speaker
        ? `${speaker.name}的数字分身`
        : `${c.hostName}的数字分身`,
    people: c.members.map((m) => `${m.name}的数字分身`),
    update: c.updatedAt,
    detail:
      c.pendingCurrentUserConfirmation?.question ??
      (c.goal ? `协作目标：${c.goal}。${c.preview}` : c.preview),
  };
}
const cols: [TaskStatus, string, string][] = [
  ["doing", "进行中", "等待分身回复或继续执行"],
  ["confirm", "待我确认", "需要你做出决定"],
  ["done", "已完成", "已送达或协作已结束"],
];
function changeDate(d: string, mode: string, n: number) {
  const v = new Date(`${d}T12:00:00`);
  if (mode === "month") {
    v.setDate(1);
    v.setMonth(v.getMonth() + n);
  } else v.setDate(v.getDate() + n * (mode === "day" ? 1 : 7));
  return v.toISOString().slice(0, 10);
}
const toDateKey = (value: Date) => value.toISOString().slice(0, 10);
const startOfWeek = (value: string) => {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
};
const eventTone = (type: string) => {
  if (["技能", "专家", "MCP"].includes(type)) return "capability";
  if (["岗位画像", "规则", "SOP"].includes(type)) return "role";
  if (["知识库"].includes(type)) return "knowledge";
  return "mind";
};
function AssessmentRadar({
  labels,
  current,
  target,
}: {
  labels: string[];
  current: number[];
  target: number[];
}) {
  if (labels.length < 3) {
    return (
      <div className="assessment-radar assessment-radar-simple">
        {labels.map((label, i) => (
          <div className="assessment-progress" key={label}>
            <div>
              <b>{label}</b>
              <span>
                {current[i]} / {target[i]}
              </span>
            </div>
            <i>
              <em style={{ width: `${current[i]}%` }} />
            </i>
          </div>
        ))}
      </div>
    );
  }
  const size = 360,
    c = 180,
    r = 86,
    n = labels.length,
    point = (i: number, v: number) => {
      const a = (i * Math.PI * 2) / n - Math.PI / 2;
      return [c + (Math.cos(a) * r * v) / 100, c + (Math.sin(a) * r * v) / 100];
    },
    points = (values: number[]) =>
      values.map((v, i) => point(i, v).join(",")).join(" ");
  return (
    <svg
      className="assessment-radar"
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="当前画像与完整配置的检查对比雷达图"
    >
      <title>当前分身与目标专家的评测对比</title>
      {[20, 40, 60, 80, 100].map((value) => (
        <polygon
          key={value}
          points={points(Array(n).fill(value))}
          fill="none"
          stroke="#e2ebf3"
          strokeWidth="1"
        />
      ))}
      {labels.map((label, i) => {
        const [x, y] = point(i, 126),
          anchor = x > c + 10 ? "start" : x < c - 10 ? "end" : "middle";
        return (
          <g key={label}>
            <line
              x1={c}
              y1={c}
              x2={point(i, 100)[0]}
              y2={point(i, 100)[1]}
              stroke="#e2ebf3"
            />
            <text
              x={x}
              y={y - 4}
              textAnchor={anchor}
              className="assessment-radar-label"
            >
              {label}
            </text>
            <text
              x={x}
              y={y + 13}
              textAnchor={anchor}
              className="assessment-radar-value"
            >
              {current[i]} / {target[i]}
            </text>
          </g>
        );
      })}
      <polygon points={points(target)} className="assessment-target" />
      <polygon points={points(current)} className="assessment-current" />
      {current.map((value, i) => (
        <circle
          key={labels[i]}
          cx={point(i, value)[0]}
          cy={point(i, value)[1]}
          r="3.5"
          className="assessment-dot"
        />
      ))}
    </svg>
  );
}
type PersonalAssessment = {
  id: string;
  at: string;
  dimensions: {
    name: string;
    score: number;
    content: string;
    checks: { name: string; passed: boolean }[];
  }[];
  resources: { name: string; version: string; enabled: boolean }[];
  roles: { name: string; version: string }[];
  tasks: {
    id: string;
    summary: string;
    at: string;
    feedback: "good" | "bad" | null;
    cause: string;
  }[];
};
const ASSESSMENT_KEY = "comac-personal-assessments-v1";
function AssessmentPanel() {
  const store = useRoleStore();
  const { perform, feedback } = useFeedback();
  const [records, setRecords] = useState<PersonalAssessment[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(ASSESSMENT_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [view, setView] = useState<
    "history" | "report" | "readiness" | "performance" | null
  >(null);
  const [selected, setSelected] = useState<PersonalAssessment | null>(null);
  const capture = (): PersonalAssessment => ({
    id: `assessment-${Date.now()}`,
    at: new Date().toLocaleString("sv-SE", { timeZone: "Asia/Shanghai" }),
    dimensions: profileTabs.map(([key, name]) => {
      const content =
        localStorage.getItem(`digital-twin-profile-${key}`) ??
        defaultProfileMarkdown[key];
      const bodies = content
        .split(/^#{1,6}\s+.+$/m)
        .slice(1)
        .map((s) => s.trim());
      const checks = [
        { name: "已填写画像内容", passed: !!content.trim() },
        { name: "包含两个以上工作主题", passed: bodies.length >= 2 },
        {
          name: "各主题均有具体内容",
          passed: bodies.length > 0 && bodies.every((b) => b.length >= 8),
        },
        {
          name: "整体内容不少于 80 字",
          passed: content.replace(/\s|#/g, "").length >= 80,
        },
      ];
      return {
        name,
        content,
        checks,
        score: checks.filter((c) => c.passed).length * 25,
      };
    }),
    resources: effectiveResources(store).map((r) => ({
      name: r.name,
      version: r.version,
      enabled: r.enabled,
    })),
    roles: (store.memberships[CURRENT_USER] || [])
      .filter((m) => m.enabled)
      .flatMap((m) => {
        const role = store.roles.find((r) => r.id === m.roleId);
        return role && availableRole(store, role)
          ? [
              {
                name: role.published!.definition.name,
                version: role.published!.version,
              },
            ]
          : [];
      }),
    tasks: store.runs
      .filter((r) => r.userId === CURRENT_USER)
      .map((r) => ({
        id: r.id,
        summary: r.summary,
        at: r.at,
        feedback: r.feedback,
        cause: r.cause,
      })),
  });
  const current = capture();
  const report = selected || current;
  const readiness = (r: PersonalAssessment) =>
    Math.round(
      r.dimensions.reduce((sum, d) => sum + d.score, 0) / r.dimensions.length,
    );
  const rated = (r: PersonalAssessment) => r.tasks.filter((t) => t.feedback);
  const satisfaction = (r: PersonalAssessment) =>
    rated(r).length
      ? Math.round(
          (r.tasks.filter((t) => t.feedback === "good").length /
            rated(r).length) *
            100,
        )
      : null;
  const show = (next: typeof view) => {
    setSelected(current);
    setView(next);
  };
  const rerun = () =>
    perform(() => {
      const next = [current, ...records].slice(0, 50);
      localStorage.setItem(ASSESSMENT_KEY, JSON.stringify(next));
      setRecords(next);
      setSelected(current);
      setView("report");
      actions.profileGrowth("完成岗位准备度检查与任务反馈汇总");
    }, "评测快照已保存");
  return (
    <section className="flat-section assessment-section">
      <div className="heading">
        <div>
          <span className="twin-eyebrow">ROLE ASSESSMENT</span>
          <h2>智能体评测</h2>
        </div>
        <div className="assessment-actions">
          <button onClick={() => setView("history")}>
            <History size={14} />
            评测记录
          </button>
          <button className="primary" onClick={rerun}>
            <RefreshCw size={14} />
            重新评测
          </button>
        </div>
      </div>
      <div className="assessment-grid">
        <article className="assessment-card">
          <header>
            <div>
              <span>01 / READINESS</span>
              <h3>岗位准备度</h3>
              <p>两类个人画像的配置完整度</p>
            </div>
            <b>
              {readiness(current)}
              <small>/ 100</small>
            </b>
          </header>
          <div className="assessment-legend">
            <i />
            当前配置 <em />
            完整配置
          </div>
          <AssessmentRadar
            labels={current.dimensions.map((d) => d.name)}
            current={current.dimensions.map((d) => d.score)}
            target={current.dimensions.map(() => 100)}
          />
          <footer>
            <span>每个维度包含 4 项内容检查</span>
            <button onClick={() => show("readiness")}>
              查看检查依据
              <ChevronRight size={13} />
            </button>
          </footer>
        </article>
        <article className="assessment-card">
          <header>
            <div>
              <span>02 / FEEDBACK</span>
              <h3>任务表现</h3>
              <p>本人已评价任务中的有帮助比例</p>
            </div>
            <b>
              {satisfaction(current) ?? "—"}
              <small>{rated(current).length ? "%" : "待评价"}</small>
            </b>
          </header>
          <div
            className="rc rc-stack"
            style={{ padding: "20px 24px", flex: 1 }}
          >
            <div className="rc-grid">
              <div>
                <h3>{current.tasks.length}</h3>
                <p>运行记录</p>
              </div>
              <div>
                <h3>{rated(current).length}</h3>
                <p>已评价任务</p>
              </div>
              <div>
                <h3>
                  {current.tasks.filter((t) => t.feedback === "bad").length}
                </h3>
                <p>待改进反馈</p>
              </div>
              <div>
                <h3>{current.resources.filter((r) => r.enabled).length}</h3>
                <p>已启用能力</p>
              </div>
            </div>
            <Notice>
              任务反馈随本人评价更新。尚未评价的记录不计入有帮助比例。
            </Notice>
          </div>
          <footer>
            <span>保留记录编号、问题归因与时间</span>
            <button onClick={() => show("performance")}>
              查看任务依据
              <ChevronRight size={13} />
            </button>
          </footer>
        </article>
      </div>
      {view && (
        <Modal
          title={
            view === "history"
              ? "评测记录"
              : view === "readiness"
                ? "岗位准备度检查依据"
                : view === "performance"
                  ? "任务反馈依据"
                  : "智能体评测报告"
          }
          eyebrow="ROLE ASSESSMENT"
          close={() => setView(null)}
        >
          <div className="rc rc-stack">
            {view === "history" ? (
              <>
                {records.length ? (
                  records.map((r) => (
                    <article className="rc-resource-row" key={r.id}>
                      <div>
                        <strong>{r.at}</strong>
                        <p>
                          准备度 {readiness(r)} / 100 · 有帮助比例{" "}
                          {satisfaction(r) === null
                            ? "待评价"
                            : satisfaction(r) + "%"}{" "}
                          · {rated(r).length} 条评价
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSelected(r);
                          setView("report");
                        }}
                      >
                        查看报告
                      </button>
                    </article>
                  ))
                ) : (
                  <Empty title="暂无已保存的评测记录">
                    完成一次重新评测后，可以按快照对比变化。
                  </Empty>
                )}
              </>
            ) : (
              <>
                <div className="rc-actions">
                  <small>
                    {report.at} · {report.id}
                  </small>
                  <button
                    onClick={() =>
                      download(
                        "个人智能体评测.json",
                        JSON.stringify(report, null, 2),
                      )
                    }
                  >
                    <Download size={14} />
                    下载报告
                  </button>
                </div>
                {view === "report" && (
                  <>
                    <div className="rc-grid">
                      <article className="rc-section">
                        <h3>岗位准备度 {readiness(report)} / 100</h3>
                        <p>依据两类个人画像的结构与内容完整性检查。</p>
                        <button onClick={() => setView("readiness")}>
                          查看检查依据
                        </button>
                      </article>
                      <article className="rc-section">
                        <h3>
                          有帮助比例{" "}
                          {satisfaction(report) === null
                            ? "待评价"
                            : satisfaction(report) + "%"}
                        </h3>
                        <p>
                          {rated(report).length} 条已评价任务 /{" "}
                          {report.tasks.length} 条运行记录
                        </p>
                        <button onClick={() => setView("performance")}>
                          查看任务依据
                        </button>
                      </article>
                    </div>
                    <h3>本次岗位与能力快照</h3>
                    <div className="rc-chips">
                      {report.roles.map((r) => (
                        <span key={r.name}>
                          {r.name} {r.version}
                        </span>
                      ))}
                    </div>
                    {report.resources.map((r) => (
                      <div className="rc-resource-row" key={r.name}>
                        <strong>{r.name}</strong>
                        <small>
                          {r.version} ·{" "}
                          {r.enabled ? "已启用" : "未启用 / 未授权"}
                        </small>
                      </div>
                    ))}
                  </>
                )}
                {view === "readiness" && (
                  <>
                    <Notice>
                      每项通过计 25
                      分，反映画像配置的完整程度；内容质量与专业能力需要结合任务结果和人工复核判断。
                    </Notice>
                    {report.dimensions.map((d) => (
                      <article className="rc-section" key={d.name}>
                        <header>
                          <h3>{d.name}</h3>
                          <Badge>{d.score} / 100</Badge>
                        </header>
                        {d.checks.map((c) => (
                          <p key={c.name}>
                            {c.passed ? "✓" : "待补充"} · {c.name}
                          </p>
                        ))}
                        <details>
                          <summary>查看当时的画像内容</summary>
                          <Markdown content={d.content} />
                        </details>
                      </article>
                    ))}
                  </>
                )}
                {view === "performance" && (
                  <>
                    {report.tasks.length ? (
                      report.tasks.map((t) => (
                        <article className="rc-section" key={t.id}>
                          <header>
                            <h3>{t.summary}</h3>
                            <Badge>
                              {t.feedback === "good"
                                ? "有帮助"
                                : t.feedback === "bad"
                                  ? "有问题"
                                  : "未评价"}
                            </Badge>
                          </header>
                          <small>
                            {t.id} · {t.at}
                          </small>
                          {t.cause && <p>问题归因：{t.cause}</p>}
                        </article>
                      ))
                    ) : (
                      <Empty title="暂无任务记录" />
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </Modal>
      )}
      {feedback}
    </section>
  );
}
export default function DigitalTwinTrainingWorkspace({
  a2aConversations,
  onOpenA2AConversation,
}: {
  a2aConversations: A2AConversation[];
  onOpenA2AConversation: (id: string) => void;
}) {
  const store = useRoleStore();
  const [profile, setProfile] = useState<ProfileTab | null>(null),
    [resource, setResource] = useState<ResourceTab | null>(null),
    [identityOpen, setIdentityOpen] = useState(false),
    [taskId, setTaskId] = useState<string | null>(null),
    [event, setEvent] = useState<Event | null>(null),
    [selectedGrowthEventId, setSelectedGrowthEventId] = useState<string | null>(null),
    [day, setDay] = useState(() =>
      new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" }),
    ),
    [mode, setMode] = useState("week");
  const tasks = useMemo(
    () => a2aConversations.map(taskFrom),
    [a2aConversations],
  );
  const user = store.people.find((p) => p.id === CURRENT_USER)!.name,
    selectedTask = tasks.find((t) => t.id === taskId);
  const resources = effectiveResources(store);
  const allEvents: Event[] = [
    ...store.growth
      .filter((e) => e.userId === CURRENT_USER)
      .map((e) => ({
        id: e.id,
        date: e.at.slice(0, 10),
        time: e.at.slice(11, 16),
        type: e.type,
        title: e.title,
        summary: e.detail,
        source: "数字分身工作台",
        operator: user,
        detail: e.detail,
      })),
    ...events,
  ];
  const currentEvents = allEvents
    .filter((e) => {
      const a = new Date(`${day}T12:00:00`),
        b = new Date(`${e.date}T12:00:00`);
      if (mode === "day") return e.date === day;
      if (mode === "month") return e.date.slice(0, 7) === day.slice(0, 7);
      const weekday = (a.getDay() + 6) % 7;
      a.setDate(a.getDate() - weekday);
      return b >= a && b.getTime() < a.getTime() + 7 * 86400000;
    })
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  const weekStart = startOfWeek(day);
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return toDateKey(date);
  });
  const monthStart = new Date(`${day.slice(0, 7)}-01T12:00:00`);
  const monthGridStart = new Date(monthStart);
  monthGridStart.setDate(monthGridStart.getDate() - ((monthGridStart.getDay() + 6) % 7));
  const monthDays = Array.from({ length: 35 }, (_, index) => {
    const date = new Date(monthGridStart);
    date.setDate(date.getDate() + index);
    return toDateKey(date);
  });
  const selectGrowthEvent = (item: Event) => {
    setSelectedGrowthEventId(item.id);
    setEvent(item);
  };
  return (
    <div className="digital-twin-training">
      <header className="top">
        <div className="person">
          <i>{user.slice(0, 1)}</i>
          <div>
            <span className="twin-eyebrow">MY DIGITAL TWIN</span>
            <h1>{user}的数字分身</h1>
            <p>解决方案经理 · 市场与营销部</p>
          </div>
        </div>
        <div className="top-identity-actions">
          <button onClick={() => setIdentityOpen(true)}>身份信息</button>
          <span className="sync">
            <CircleCheck size={15} />
            身份已同步
          </span>
        </div>
      </header>
      <main className="digital-twin-scroll">
        <div className="content">
          <div className="overview-stack">
            <section className="flat-section">
              <div className="heading">
                <div>
                  <span className="twin-eyebrow">WORK PROFILE</span>
                  <h2>用户心智</h2>
                </div>
              </div>
              <div className="flat-rail">
                {profileTabs.map(([id, label, description], i) => (
                  <button
                    className="flat-card"
                    key={id}
                    onClick={() => setProfile(id)}
                  >
                    <span>0{i + 1}</span>
                    <b>{label}</b>
                    <p>{description}</p>
                    <ChevronRight size={16} />
                  </button>
                ))}
              </div>
            </section>
            <PersonalRoles />
            <section className="flat-section">
              <div className="heading">
                <div>
                  <span className="twin-eyebrow">CAPABILITIES</span>
                  <h2>能力</h2>
                </div>
              </div>
              <div className="flat-rail resource-rail">
                {resourceTabs.map(([id, label], i) => {
                  const Icon = [GraduationCap, Sparkles, Plug, Database][i];
                  const kind = i === 0 ? "expert" : i === 1 ? "skill" : "mcp";
                  const count = resources.filter(
                    (r) => r.kind === kind && r.enabled,
                  ).length;
                  return (
                    <button
                      className="flat-card resource-card"
                      key={id}
                      onClick={() => setResource(id)}
                    >
                      <i>
                        <Icon size={20} />
                      </i>
                      <span>
                        {i === 3 ? "本人知识资源" : `${count} 项可用`}
                      </span>
                      <b>{label}</b>
                      <p>
                        {
                          [
                            "专业方向与协作专家",
                            "专项工作方法与技能",
                            "业务系统与工具连接",
                            "知识关系与个人资料",
                          ][i]
                        }
                      </p>
                      <ChevronRight size={16} />
                    </button>
                  );
                })}
              </div>
            </section>
            <AssessmentPanel />
            <section className="growth-curve">
              <header className="growth-curve-heading">
                <div>
                  <span>GROWTH TIMELINE</span>
                  <h2>成长曲线</h2>
                  <p>按时间查看岗位、能力、画像与知识如何逐步补齐。</p>
                </div>
                <small>{currentEvents.length} 条成长事件</small>
              </header>
              <div className="growth-controls">
                <label className="growth-date-picker">
                  <CalendarDays size={16} />
                  <input
                    aria-label="成长记录日期"
                    type="date"
                    value={day}
                    onChange={(e) => e.target.value && setDay(e.target.value)}
                  />
                </label>
                <div className="growth-period-picker">
                  <button aria-label="上一个周期" onClick={() => setDay(changeDate(day, mode, -1))}>
                    <ArrowLeft size={16} />
                  </button>
                  <b>{mode === "month" ? day.slice(0, 7).replace("-", " / ") : day.replaceAll("-", " / ")}</b>
                  <button aria-label="下一个周期" onClick={() => setDay(changeDate(day, mode, 1))}>
                    <ArrowRight size={16} />
                  </button>
                </div>
                <div className="growth-view-switch" aria-label="成长曲线视图">
                  {[["day", "日"], ["week", "周"], ["month", "月"]].map(([value, label]) => (
                    <button className={mode === value ? "active" : ""} onClick={() => setMode(value)} key={value}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {mode === "day" && (
                <div className="growth-schedule growth-day-view">
                  <div className="growth-hour-grid">
                    {Array.from({ length: 13 }, (_, index) => <span key={index}>{index === 0 ? "00:00" : `${String(index * 2).padStart(2, "0")}:00`}</span>)}
                  </div>
                  <div className="growth-day-events">
                    {currentEvents.map((item, index) => {
                      const [hour, minute] = item.time.split(":").map(Number);
                      return <button key={item.id} className={`growth-event-chip ${eventTone(item.type)} ${selectedGrowthEventId === item.id ? "selected" : ""}`} style={{ left: `${Math.min(91, Math.max(1, ((hour + minute / 60) / 24) * 100))}%`, top: `${20 + (index % 3) * 47}px` }} onClick={() => selectGrowthEvent(item)}>
                        <i /> <span>{item.type}</span><b>{item.title}</b>
                      </button>;
                    })}
                    {!currentEvents.length && <p className="growth-blank">这一天没有新的成长记录</p>}
                  </div>
                </div>
              )}

              {mode === "week" && (
                <div className="growth-schedule growth-week-view">
                  {weekDays.map((date, index) => {
                    const items = currentEvents.filter((item) => item.date === date);
                    return <section className={date === day ? "selected-day" : ""} key={date}>
                      <button className="growth-day-label" onClick={() => { setDay(date); setMode("day"); }}><span>周{["一", "二", "三", "四", "五", "六", "日"][index]}</span><b>{date.slice(5).replace("-", "/")}</b></button>
                      <div>{items.map((item) => <button key={item.id} className={`growth-event-chip ${eventTone(item.type)} ${selectedGrowthEventId === item.id ? "selected" : ""}`} onClick={() => selectGrowthEvent(item)}><i /><span>{item.type}</span><b>{item.title}</b></button>)}</div>
                    </section>;
                  })}
                </div>
              )}

              {mode === "month" && (
                <div className="growth-schedule growth-month-view">
                  {["一", "二", "三", "四", "五", "六", "日"].map((label) => <b className="growth-weekday" key={label}>周{label}</b>)}
                  {monthDays.map((date) => {
                    const items = currentEvents.filter((item) => item.date === date);
                    const inCurrentMonth = date.slice(0, 7) === day.slice(0, 7);
                    return <button className={`growth-month-day ${inCurrentMonth ? "" : "muted"} ${date === day ? "selected-day" : ""}`} key={date} onClick={() => { setDay(date); setMode("day"); }}>
                      <span>{Number(date.slice(-2))}</span>
                      <i>{items.slice(0, 3).map((item) => <em className={eventTone(item.type)} key={item.id} />)}</i>
                      {items.length > 3 && <small>+{items.length - 3}</small>}
                    </button>;
                  })}
                </div>
              )}

              <div className="growth-records-heading"><span>↗</span><b>成长记录</b><small>点击查看本次变更详情</small></div>
              {currentEvents.length ? <div className="growth-records" role="list">
                {currentEvents.slice().reverse().map((item) => <button role="listitem" key={item.id} className={`growth-record ${eventTone(item.type)} ${selectedGrowthEventId === item.id ? "selected" : ""}`} onClick={() => selectGrowthEvent(item)}>
                  <time>{item.date.slice(5).replace("-", ".")}<small>{item.time}</small></time><i /><div><span>新增{item.type}</span><b>{item.title.replace(/^新增/, "")}</b><p>{item.summary}</p></div>
                </button>)}
              </div> : <Empty title="所选周期暂无成长事件" />}
            </section>
            <section>
              <div className="heading">
                <div>
                  <span className="twin-eyebrow">A2A TASK BOARD</span>
                  <h2>A2A 任务</h2>
                </div>
              </div>
              <div className="board">
                {cols.map(([id, title, desc]) => {
                  const list = tasks.filter((t) => t.status === id);
                  return (
                    <section key={id}>
                      <header>
                        <div>
                          <i />
                          <b>{title}</b>
                          <small>{desc}</small>
                        </div>
                        <em>{list.length}</em>
                      </header>
                      <div>
                        {list.length ? (
                          list.map((t) => (
                            <button
                              className="task"
                              key={t.id}
                              onClick={() => setTaskId(t.id)}
                            >
                              <span>{t.kind}</span>
                              <b>{t.title}</b>
                              <p>{t.detail}</p>
                              <div>
                                {t.people.map((x) => (
                                  <i key={x}>{x.slice(0, 1)}</i>
                                ))}
                                <small>{t.people.join(" · ")}</small>
                              </div>
                              <footer>
                                <span>{t.owner}</span>
                                <time>{t.update}</time>
                              </footer>
                            </button>
                          ))
                        ) : (
                          <div className="rc">
                            <Empty title={`暂无${title}任务`} />
                          </div>
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            </section>
            <PersonalLogs />
          </div>
        </div>
      </main>
      {identityOpen && (
        <Dialog title="身份信息" onClose={() => setIdentityOpen(false)}>
          <div className="rc-grid">
            {[
              ["姓名", user],
              ["工号", "AI0340"],
              ["岗位", "解决方案经理"],
              ["部门", "市场与营销部"],
              ["组织", "商飞智能"],
              ["小组", "产品与方案协作组、方案评审小组"],
            ].map(([label, value]) => (
              <div key={label}>
                <small>{label}</small>
                <p>{value}</p>
              </div>
            ))}
          </div>
        </Dialog>
      )}
      {profile && (
        <ProfileDialog
          key={profile}
          profile={profile}
          onClose={() => setProfile(null)}
        />
      )}{" "}
      {resource && (
        <Dialog
          title={resourceTabs.find((x) => x[0] === resource)?.[1] || "能力"}
          onClose={() => setResource(null)}
          wide
        >
          <div className="rc-segments" style={{ marginBottom: 22 }}>
            {resourceTabs.map(([id, label]) => (
              <button
                className={resource === id ? "active" : ""}
                onClick={() => setResource(id)}
                key={id}
              >
                {label}
              </button>
            ))}
          </div>
          {resource === "libraries" ? (
            <PersonalKnowledge />
          ) : (
            <PersonalCapabilities
              key={resource}
              kind={
                resource === "experts"
                  ? "expert"
                  : resource === "skills"
                    ? "skill"
                    : "mcp"
              }
            />
          )}
        </Dialog>
      )}
      {selectedTask && (
        <Dialog
          title={selectedTask.title}
          onClose={() => setTaskId(null)}
          footer={
            <>
              <button onClick={() => setTaskId(null)}>关闭</button>
              <button
                className="rc-primary"
                onClick={() => {
                  onOpenA2AConversation(selectedTask.conversationId);
                  setTaskId(null);
                }}
              >
                进入对应会话
              </button>
            </>
          }
        >
          <div className="rc-stack">
            <p>{selectedTask.detail}</p>
            <p>执行人：{selectedTask.owner}</p>
            <p>参与分身：{selectedTask.people.join("、")}</p>
          </div>
        </Dialog>
      )}
      {event && (
        <Dialog title={event.title} onClose={() => setEvent(null)}>
          <div className="rc-stack">
            <Badge>{event.type}</Badge>
            <p>{event.detail}</p>
            <small>
              {event.date} {event.time} · {event.source} · {event.operator}
            </small>
          </div>
        </Dialog>
      )}
    </div>
  );
}
function ProfileDialog({
  profile,
  onClose,
}: {
  profile: ProfileTab;
  onClose: () => void;
}) {
  const key = `digital-twin-profile-${profile}`,
    title = profileTabs.find((t) => t[0] === profile)![1];
  const [content, setContent] = useState(() => {
      try {
        return localStorage.getItem(key) || defaultProfileMarkdown[profile];
      } catch {
        return defaultProfileMarkdown[profile];
      }
    }),
    [original, setOriginal] = useState(content),
    [editing, setEditing] = useState(false),
    [confirm, setConfirm] = useState(false);
  const { perform, feedback } = useFeedback();
  const dirty = content !== original;
  return (
    <>
      <Dialog
        title={title}
        onClose={() => (dirty ? setConfirm(true) : onClose())}
        wide
        footer={
          <>
            <button onClick={() => (dirty ? setConfirm(true) : onClose())}>
              关闭
            </button>
            {editing ? (
              <>
                <button
                  onClick={() => {
                    setContent(original);
                    setEditing(false);
                  }}
                >
                  取消编辑
                </button>
                <button
                  className="rc-primary"
                  onClick={() => {
                    if (
                      perform(() => {
                        if (!content.trim()) throw new Error("内容不能为空");
                        localStorage.setItem(key, content);
                        actions.profileGrowth(title);
                        setOriginal(content);
                        setEditing(false);
                      }, "已保存个人工作画像") !== false
                    )
                      setEditing(false);
                  }}
                >
                  保存
                </button>
              </>
            ) : (
              <button className="rc-primary" onClick={() => setEditing(true)}>
                <Pencil size={14} />
                编辑
              </button>
            )}
          </>
        }
      >
        {editing ? (
          <textarea
            className="rc-editor"
            aria-label={`编辑${title} Markdown`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        ) : (
          <Markdown content={content} />
        )}
      </Dialog>
      {confirm && (
        <Confirm
          title="放弃未保存的修改"
          description="当前修改尚未保存，确认关闭后将恢复原内容。"
          onClose={() => setConfirm(false)}
          onConfirm={onClose}
        />
      )}{" "}
      {feedback}
    </>
  );
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  eyebrow?: string;
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog title={title} onClose={close} wide>
      <div
        className="digital-twin-training"
        style={{
          height: "auto",
          overflow: "visible",
          background: "transparent",
        }}
      >
        {children}
      </div>
    </Dialog>
  );
}
