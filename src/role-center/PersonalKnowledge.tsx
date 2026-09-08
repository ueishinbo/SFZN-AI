import { useFeedback } from "./feedback";
import { useRef, useState } from "react";
import { Database, Plus, Upload } from "lucide-react";
import KnowledgeMap from "../digital-twin/KnowledgeMap";
import { actions, download } from "./store";
import { uid, stamp } from "./domain";
import { Badge, Confirm, Dialog, Empty, Markdown } from "./ui";
type Knowledge = {
  id: string;
  name: string;
  content: string;
  enabled: boolean;
  at: string;
  personal: boolean;
};
const KEY = "comac-personal-knowledge-v1";
const seeds: Knowledge[] = [
  {
    id: "enterprise",
    name: "企业制度库",
    content:
      "# 交付与数据管理\n- 项目关键节点需保留评审与验收依据。\n- 对外发送文件前进行权限核验与敏感信息检查。\n- 访问业务数据须遵循已有授权。",
    enabled: true,
    at: "2026-09-04 09:00",
    personal: false,
  },
  {
    id: "brain",
    name: "C 大脑知识",
    content:
      "# 方案工作过程\n需求传递 → 需求澄清 → 方案设计 → 方案评审 → 方案交付\n\n# 知识组织\n按过程、输入、输出、责任人与制度依据关联。",
    enabled: true,
    at: "2026-09-04 09:00",
    personal: false,
  },
  {
    id: "experience",
    name: "个人项目经验",
    content:
      "# 方案评审检查单\n- 先确认验收目标和不可妥协的边界。\n- 明确资料来源、版本与更新时间。\n- 对外方案先给结论和风险，再展开依据。\n- 将未确认假设与事实分开记录。",
    enabled: true,
    at: "2026-09-03 14:20",
    personal: true,
  },
];
export default function PersonalKnowledge() {
  const [items, setItems] = useState<Knowledge[]>(() => {
      try {
        return JSON.parse(localStorage.getItem(KEY) || "null") || seeds;
      } catch {
        return seeds;
      }
    }),
    [view, setView] = useState("list"),
    [selected, setSelected] = useState<Knowledge | null>(null),
    [editing, setEditing] = useState(false),
    [remove, setRemove] = useState(""),
    [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const { perform, feedback } = useFeedback();
  const save = (next: Knowledge[]) => {
    localStorage.setItem(KEY, JSON.stringify(next));
    setItems(next);
  };
  return (
    <div className="rc rc-stack">
      <div className="rc-heading" style={{ margin: 0 }}>
        <div>
          <h2>知识库</h2>
          <p>本人可访问的知识资源与个人资料</p>
        </div>
        <div className="rc-actions">
          <button onClick={() => input.current?.click()}>
            <Upload size={15} />
            导入资料
          </button>
          <button
            className="rc-primary"
            onClick={() => {
              setSelected({
                id: uid("knowledge"),
                name: "",
                content: "",
                enabled: true,
                personal: true,
                at: stamp(),
              });
              setEditing(true);
            }}
          >
            <Plus size={15} />
            新增个人知识
          </button>
        </div>
      </div>
      <input
        type="file"
        accept=".md,.txt"
        hidden
        ref={input}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const node = e.target;
          if (f.size > 1024 * 1024) {
            perform(() => {
              throw new Error("请选择小于 1 MB 的文字文件");
            });
            return;
          }
          const content = await f.text();
          perform(() => {
            if (!content.trim()) throw new Error("文件内容为空");
            save([
              {
                id: uid("knowledge"),
                name: f.name.replace(/\.(md|txt)$/i, ""),
                content,
                enabled: true,
                personal: true,
                at: stamp(),
              },
              ...items,
            ]);
            actions.profileGrowth(`导入个人知识：${f.name}`);
          }, "个人资料已导入");
          node.value = "";
        }}
      />
      <div className="rc-toolbar">
        <div className="rc-segments">
          <button
            className={view === "list" ? "active" : ""}
            onClick={() => setView("list")}
          >
            知识清单
          </button>
          <button
            className={view === "graph" ? "active" : ""}
            onClick={() => setView("graph")}
          >
            知识地图
          </button>
        </div>
        {view === "list" && (
          <input
            aria-label="搜索知识"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索知识名称或内容"
          />
        )}
      </div>
      {view === "graph" ? (
        <KnowledgeMap />
      ) : (
        <div>
          {items
            .filter((i) => `${i.name}${i.content}`.includes(query))
            .map((item) => (
              <div className="rc-resource-row" key={item.id}>
                <i className="rc-role-icon">
                  <Database size={20} />
                </i>
                <div>
                  <strong>{item.name}</strong>
                  <p>
                    {item.personal ? "仅本人" : "企业授权资源"} · 更新于{" "}
                    {item.at}
                  </p>
                </div>
                <Badge tone={item.enabled ? "green" : "gray"}>
                  {item.enabled ? "已启用" : "已停用"}
                </Badge>
                <button
                  onClick={() => {
                    setSelected(item);
                    setEditing(false);
                  }}
                >
                  查看
                </button>
                <button
                  onClick={() =>
                    perform(() => {
                      save(
                        items.map((i) =>
                          i.id === item.id ? { ...i, enabled: !i.enabled } : i,
                        ),
                      );
                      actions.profileGrowth(
                        `${item.enabled ? "停用" : "启用"}知识库：${item.name}`,
                      );
                    }, "知识库状态已更新")
                  }
                >
                  {item.enabled ? "停用" : "启用"}
                </button>
              </div>
            ))}
          {!items.some((i) => `${i.name}${i.content}`.includes(query)) && (
            <Empty title="没有匹配的知识" />
          )}
        </div>
      )}
      {selected && (
        <Dialog
          title={editing ? "编辑个人知识" : selected.name}
          onClose={() => setSelected(null)}
          wide
          footer={
            <>
              <button onClick={() => setSelected(null)}>关闭</button>
              {editing ? (
                <button
                  className="rc-primary"
                  onClick={() => {
                    if (
                      perform(() => {
                        if (!selected.name.trim() || !selected.content.trim())
                          throw new Error("名称与正文不能为空");
                        save(
                          items.some((i) => i.id === selected.id)
                            ? items.map((i) =>
                                i.id === selected.id
                                  ? { ...selected, at: stamp() }
                                  : i,
                              )
                            : [{ ...selected, at: stamp() }, ...items],
                        );
                        actions.profileGrowth(`更新个人知识：${selected.name}`);
                      }, "个人知识已保存") !== false
                    )
                      setSelected(null);
                  }}
                >
                  保存
                </button>
              ) : (
                <>
                  <button
                    onClick={() =>
                      download(
                        `${selected.name}.md`,
                        selected.content,
                        "text/markdown",
                      )
                    }
                  >
                    下载
                  </button>
                  {selected.personal && (
                    <>
                      <button
                        className="rc-danger"
                        onClick={() => setRemove(selected.id)}
                      >
                        删除
                      </button>
                      <button
                        className="rc-primary"
                        onClick={() => setEditing(true)}
                      >
                        编辑
                      </button>
                    </>
                  )}
                </>
              )}
            </>
          }
        >
          <div className="rc-stack">
            {editing ? (
              <>
                <label className="rc-field">
                  知识名称
                  <input
                    value={selected.name}
                    onChange={(e) =>
                      setSelected({ ...selected, name: e.target.value })
                    }
                  />
                </label>
                <label className="rc-field">
                  正文
                  <textarea
                    className="rc-editor"
                    value={selected.content}
                    onChange={(e) =>
                      setSelected({ ...selected, content: e.target.value })
                    }
                  />
                </label>
              </>
            ) : (
              <Markdown content={selected.content} />
            )}
          </div>
        </Dialog>
      )}
      {remove && (
        <Confirm
          danger
          title="删除个人知识"
          description="此资料将从你的知识库移除，删除不会影响其他人员。"
          label="确认删除"
          onClose={() => setRemove("")}
          onConfirm={() => {
            if (
              perform(() => {
                save(items.filter((i) => i.id !== remove));
                actions.profileGrowth("删除一项个人知识");
              }, "个人知识已删除") !== false
            ) {
              setRemove("");
              setSelected(null);
            }
          }}
        />
      )}
      {feedback}
    </div>
  );
}
