import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Check, FileText, Search, Upload, X } from "lucide-react";
import {
  GROUPS,
  HEADINGS,
  ORGS,
  RESPONSIBILITY_HEADINGS,
  scopeLabels,
  sections,
  type Person,
  type Scope,
  type Definition,
} from "./domain";
import { download } from "./store";
import "./role-center.css";

export function Dialog({
  title,
  children,
  onClose,
  footer,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const node = ref.current;
    node?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close.current();
      }
      if (e.key === "Tab") {
        const nodes = Array.from(
          node?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]',
          ) || [],
        ).filter((n) => n.getClientRects().length);
        const first = nodes[0],
          last = nodes.at(-1);
        if (!first) {
          e.preventDefault();
          return;
        }
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === node)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    node?.addEventListener("keydown", key);
    return () => {
      node?.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return createPortal(
    <div
      className="rc-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={`rc rc-dialog ${wide ? "rc-dialog-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header>
          <h2 id={titleId}>{title}</h2>
          <button className="rc-icon" aria-label="关闭弹窗" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        <div className="rc-dialog-body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
export function Confirm({
  title,
  description,
  onClose,
  onConfirm,
  danger = false,
  label = "确认",
}: {
  title: string;
  description: ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  danger?: boolean;
  label?: string;
}) {
  return (
    <Dialog
      title={title}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose}>取消</button>
          <button
            className={danger ? "rc-danger" : "rc-primary"}
            onClick={onConfirm}
          >
            {label}
          </button>
        </>
      }
    >
      {description}
    </Dialog>
  );
}
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={`rc-notice ${error ? "rc-error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {error ? <AlertCircle size={17} /> : <Check size={17} />}
      <div>{children}</div>
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="rc-empty">
      <Search size={26} />
      <strong>{title}</strong>
      {children}
    </div>
  );
}
export function Badge({
  children,
  tone,
}: {
  children: ReactNode;
  tone?: string;
}) {
  const text = String(children);
  return (
    <span
      className={`rc-badge ${tone || (text.includes("发布") || text === "已通过" || text === "已启用" ? "green" : text.includes("审批") || text.includes("异常") || text.includes("拒") ? "amber" : text.includes("草稿") || text.includes("停用") ? "gray" : "blue")}`}
    >
      {children}
    </span>
  );
}
function inline(text: string): ReactNode {
  return text
    .split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g)
    .map((part, i) => {
      if (part.startsWith("**"))
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      if (part.startsWith("`")) return <code key={i}>{part.slice(1, -1)}</code>;
      const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link && /^https?:\/\//i.test(link[2]))
        return (
          <a key={i} href={link[2]} target="_blank" rel="noreferrer">
            {link[1]}
          </a>
        );
      return part;
    });
}
export function Markdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const nodes: ReactNode[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const h = line.match(/^(#{1,6})\s+(.+)/);
    if (h) {
      nodes.push(
        h[1].length === 1 ? <h3 key={i}>{h[2]}</h3> : <h4 key={i}>{h[2]}</h4>,
      );
      continue;
    }
    if (line.startsWith("```")) {
      const start = i;
      let code = "";
      for (i++; i < lines.length && !lines[i].startsWith("```"); i++)
        code += lines[i] + "\n";
      nodes.push(<pre key={start}>{code}</pre>);
      continue;
    }
    if (line.includes("|") && lines[i + 1]?.match(/^\s*\|?\s*:?-{3}/)) {
      const start = i;
      const cells = (s: string) =>
        s
          .trim()
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((x) => x.trim());
      const heads = cells(line),
        rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].includes("|")) {
        rows.push(cells(lines[i]));
        i++;
      }
      i--;
      nodes.push(
        <div className="rc-table-wrap" key={start}>
          <table>
            <thead>
              <tr>
                {heads.map((x, n) => (
                  <th key={n}>{inline(x)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, n) => (
                <tr key={n}>
                  {r.map((x, k) => (
                    <td key={k}>{inline(x)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    const list = line.match(/^\s*(?:[-*]|\d+[.)])\s+(.+)/);
    nodes.push(
      list ? (
        <p className="rc-md-list" key={i}>
          • {inline(list[1])}
        </p>
      ) : (
        <p key={i}>{inline(line.replace(/^>\s*/, ""))}</p>
      ),
    );
  }
  return (
    <article className="rc-markdown">
      {nodes.length ? nodes : <Empty title="尚未填写岗位说明书" />}
    </article>
  );
}
export function ScopePicker({
  value,
  onChange,
  people,
  readonly = false,
}: {
  value: Scope;
  onChange?: (s: Scope) => void;
  people: Person[];
  readonly?: boolean;
}) {
  const [kind, setKind] = useState<keyof Scope>("orgs"),
    [query, setQuery] = useState("");
  const choices =
    kind === "orgs"
      ? ORGS
      : kind === "groups"
        ? GROUPS
        : people.filter((p) => p.active);
  return (
    <div className="rc-scope">
      {!readonly && (
        <>
          <div className="rc-segments">
            {(["orgs", "groups", "users"] as const).map((k, i) => (
              <button
                type="button"
                className={kind === k ? "active" : ""}
                onClick={() => {
                  setKind(k);
                  setQuery("");
                }}
                key={k}
              >
                {["按组织", "按小组", "指定用户"][i]}
              </button>
            ))}
          </div>
          <label className="rc-search">
            <Search size={16} />
            <input
              aria-label="搜索范围"
              placeholder={`搜索${kind === "orgs" ? "组织" : kind === "groups" ? "小组" : "人员"}`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="rc-scope-options">
            {choices
              .filter((x) => x.name.includes(query))
              .map((x) => (
                <label
                  key={x.id}
                  className={
                    kind === "orgs"
                      ? x.id === "comac"
                        ? "rc-scope-org-root"
                        : "rc-scope-org-child"
                      : undefined
                  }
                >
                  <input
                    type="checkbox"
                    checked={value[kind].includes(x.id)}
                    onChange={() =>
                      onChange?.({
                        ...value,
                        [kind]: value[kind].includes(x.id)
                          ? value[kind].filter((id) => id !== x.id)
                          : [...value[kind], x.id],
                      })
                    }
                  />
                  <span>{x.name}</span>
                </label>
              ))}
            {!choices.some((x) => x.name.includes(query)) && (
              <small>未找到匹配项</small>
            )}
          </div>
        </>
      )}
      <div className="rc-chips">
        {scopeLabels(value, people).map((label) => (
          <span key={label}>{label}</span>
        ))}
        {!scopeLabels(value, people).length && <small>尚未选择范围</small>}
      </div>
    </div>
  );
}
export function Summary({ definition }: { definition: Definition }) {
  const parsed = sections(definition.responsibilities);
  return (
    <div className="rc-summary">
      {RESPONSIBILITY_HEADINGS.map((h, i) => (
        <div key={h} className={i === 0 ? "wide" : ""}>
          <small>{h}</small>
          <p>{parsed[h] || "尚未填写"}</p>
        </div>
      ))}
    </div>
  );
}
export function DefinitionEditor({
  value,
  onChange,
  readonly = false,
}: {
  value: Definition;
  onChange: (d: Definition) => void;
  readonly?: boolean;
}) {
  const [editing, setEditing] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [linkOpen, setLinkOpen] = useState(false),
    [linkName, setLinkName] = useState(""),
    [linkUrl, setLinkUrl] = useState(""),
    [linkError, setLinkError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const importFile = async (file?: File) => {
    if (!file) return;
    setError("");
    if (file.size > 4 * 1024 * 1024) {
      setError("请选择小于 4 MB 的文档");
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      const buffer = await file.arrayBuffer();
      let markdown = "";
      if (ext === "md" || ext === "txt")
        markdown = new TextDecoder().decode(buffer);
      else if (ext === "docx") {
        const mammoth = await import("mammoth");
        markdown = (await mammoth.extractRawText({ arrayBuffer: buffer }))
          .value;
      } else if (ext === "pdf") {
        const pdfjs = await import("pdfjs-dist");
        const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        const loading = pdfjs.getDocument({ data: buffer.slice(0) });
        const pdf = await loading.promise;
        try {
          const pages = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            pages.push(
              content.items
                .map((item) =>
                  "str" in item
                    ? item.str + ("hasEOL" in item && item.hasEOL ? "\n" : " ")
                    : "",
                )
                .join(""),
            );
          }
          markdown = pages.join("\n\n");
        } finally {
          await loading.destroy();
        }
      } else throw new Error("支持 .docx、.pdf、.md、.txt 文件");
      if (!markdown.trim())
        throw new Error("未提取到可编辑文本；扫描文件请先转换为文字文档。");
      HEADINGS.forEach((h) => {
        markdown = markdown.replace(
          new RegExp(
            `(^|\\n)\\s*${h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*(?=\\n|$)`,
            "g",
          ),
          `$1# ${h}`,
        );
      });
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      onChange({ ...value, markdown, attachment: { name: file.name, data } });
      setEditing(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "文件解析失败，请重试");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };
  return (
    <>
      <div className="rc-actions rc-editor-tools">
        <span>
          <FileText size={16} />
          Markdown 正文
        </span>
        {!readonly && (
          <>
            <input
              hidden
              ref={input}
              type="file"
              accept=".md,.txt,.docx,.pdf"
              onChange={(e) => void importFile(e.target.files?.[0])}
            />
            <button disabled={busy} onClick={() => input.current?.click()}>
              <Upload size={15} />
              {busy ? "正在解析…" : "上传文件"}
            </button>
            <button onClick={() => setEditing(!editing)}>
              {editing ? "预览" : "在线编辑"}
            </button>
          </>
        )}
        <button
          onClick={() =>
            download(
              `${value.name || "岗位说明书"}.md`,
              value.markdown,
              "text/markdown",
            )
          }
        >
          下载正文
        </button>
      </div>
      {error && <Notice error>{error}</Notice>}
      {linkOpen && (
        <Dialog
          title="插入参考链接"
          onClose={() => setLinkOpen(false)}
          footer={
            <>
              <button onClick={() => setLinkOpen(false)}>取消</button>
              <button
                className="rc-primary"
                onClick={() => {
                  try {
                    const url = new URL(linkUrl);
                    if (
                      !["http:", "https:"].includes(url.protocol) ||
                      !linkName.trim()
                    )
                      throw new Error(
                        "请填写链接名称和有效的 HTTP 或 HTTPS 地址",
                      );
                    onChange({
                      ...value,
                      markdown:
                        value.markdown +
                        `\n[${linkName.trim().replace(/[\u005b\u005d]/g, "")}](${url.href.replace(/[()]/g, (c) => (c === "(" ? "%28" : "%29"))})\n`,
                    });
                    setLinkOpen(false);
                  } catch {
                    setLinkError("请填写链接名称和有效的 HTTP 或 HTTPS 地址");
                  }
                }}
              >
                插入链接
              </button>
            </>
          }
        >
          <div className="rc-stack">
            <label className="rc-field">
              链接名称
              <input
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
              />
            </label>
            <label className="rc-field">
              链接地址
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
            </label>
            {linkError && <Notice error>{linkError}</Notice>}
          </div>
        </Dialog>
      )}
      {value.attachment && (
        <a
          className="rc-attachment"
          download={value.attachment.name}
          href={value.attachment.data}
        >
          <FileText size={16} />
          {value.attachment.name}
        </a>
      )}
      {editing && !readonly ? (
        <>
          <div className="rc-actions">
            <button
              onClick={() =>
                onChange({
                  ...value,
                  markdown: value.markdown + "\n\n## 章节标题\n",
                })
              }
            >
              标题
            </button>
            <button
              onClick={() =>
                onChange({
                  ...value,
                  markdown: value.markdown + "\n- 列表项\n",
                })
              }
            >
              列表
            </button>
            <button
              onClick={() =>
                onChange({
                  ...value,
                  markdown:
                    value.markdown +
                    "\n\n| 检查项 | 验收标准 |\n| --- | --- |\n| 内容 | 标准 |\n",
                })
              }
            >
              表格
            </button>
            <button
              onClick={() => {
                setLinkOpen(true);
                setLinkName("");
                setLinkUrl("");
                setLinkError("");
              }}
            >
              链接
            </button>
          </div>
          <textarea
            className="rc-editor"
            aria-label="岗位说明书 Markdown"
            value={value.markdown}
            onChange={(e) => onChange({ ...value, markdown: e.target.value })}
          />
        </>
      ) : (
        <Markdown content={value.markdown} />
      )}
    </>
  );
}
