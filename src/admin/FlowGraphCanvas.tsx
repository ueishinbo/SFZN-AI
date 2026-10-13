import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Search, ZoomIn, ZoomOut } from "lucide-react";
import {
  EDGE_KIND_LABEL,
  NODE_KIND_LABEL,
  bindingKey,
  isBindable,
  type FlowEdgeKind,
  type FlowNode,
  type FlowNodeKind,
  type ValueFlow,
} from "./valueFlows";

const EDGE_COLORS: Record<FlowEdgeKind, string> = {
  input: "#5f9e6e",
  output: "#4f86c6",
  owner: "#9077c9",
  user: "#c77fae",
  resource: "#a08a5f",
  flow: "#37475a",
};

const NODE_STYLE: Record<
  FlowNodeKind,
  { stroke: string; fill: string; chip: string; chipText: string }
> = {
  value: { stroke: "#35b8c9", fill: "#f2fbfd", chip: "#35b8c9", chipText: "V" },
  activity: { stroke: "#e8875a", fill: "#fdf6f1", chip: "#e8875a", chipText: "P" },
  "org-owner": { stroke: "#b9a6e0", fill: "#f7f4fc", chip: "#9077c9", chipText: "D" },
  "org-resource": { stroke: "#9aa7b5", fill: "#f5f7f9", chip: "#7d8b99", chipText: "R" },
  document: { stroke: "#8fbf6f", fill: "#f4faee", chip: "#6da24e", chipText: "" },
  start: { stroke: "#9aa7b5", fill: "#ffffff", chip: "", chipText: "" },
  end: { stroke: "#9aa7b5", fill: "#ffffff", chip: "", chipText: "" },
};

function nodeSize(node: FlowNode) {
  if (node.kind === "start" || node.kind === "end") return { w: 68, h: 68 };
  const w = Math.min(236, Math.max(116, node.name.length * 13 + 44));
  const h = isBindable(node.kind) ? 66 : 46;
  return { w, h };
}

type Transform = { x: number; y: number; k: number };

export default function FlowGraphCanvas({
  flow,
  bindings,
  selectedNodeId,
  onSelectNode,
  onInspectNode,
  focusNodeId,
  focusNonce,
}: {
  flow: ValueFlow;
  bindings: Record<string, string[]>;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onInspectNode: (nodeId: string) => void;
  focusNodeId: string | null;
  focusNonce: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<Transform>({ x: 40, y: 40, k: 0.6 });
  const [hoverNode, setHoverNode] = useState<string | null>(null);
  const [hoverEdge, setHoverEdge] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [legendOpen, setLegendOpen] = useState(false);
  const drag = useRef<{ x: number; y: number } | null>(null);

  const bounds = useMemo(() => {
    const xs = flow.nodes.map((node) => node.x);
    const ys = flow.nodes.map((node) => node.y);
    return {
      minX: Math.min(...xs) - 150,
      maxX: Math.max(...xs) + 150,
      minY: Math.min(...ys) - 100,
      maxY: Math.max(...ys) + 100,
    };
  }, [flow]);

  const fit = () => {
    const el = wrapRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const spanX = bounds.maxX - bounds.minX;
    const spanY = bounds.maxY - bounds.minY;
    const k = Math.min(width / spanX, height / spanY, 1.3);
    setTransform({
      k,
      x: (width - spanX * k) / 2 - bounds.minX * k,
      y: (height - spanY * k) / 2 - bounds.minY * k,
    });
  };

  useEffect(() => {
    fit();
    setHoverNode(null);
    setHoverEdge(null);
    setQuery("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow.id]);

  const centerOn = (nodeId: string, minK = 1) => {
    const el = wrapRef.current;
    const node = flow.nodes.find((item) => item.id === nodeId);
    if (!el || !node) return;
    const { width, height } = el.getBoundingClientRect();
    const k = Math.max(transform.k, minK);
    setTransform({ k, x: width / 2 - node.x * k, y: height / 2 - node.y * k });
  };

  useEffect(() => {
    if (focusNodeId) centerOn(focusNodeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNonce]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      setTransform((current) => {
        const k = Math.min(2.4, Math.max(0.2, current.k * (event.deltaY < 0 ? 1.12 : 0.9)));
        return { k, x: px - ((px - current.x) * k) / current.k, y: py - ((py - current.y) * k) / current.k };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const zoomBy = (factor: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setTransform((current) => {
      const k = Math.min(2.4, Math.max(0.2, current.k * factor));
      return {
        k,
        x: width / 2 - ((width / 2 - current.x) * k) / current.k,
        y: height / 2 - ((height / 2 - current.y) * k) / current.k,
      };
    });
  };

  const connected = useMemo(() => {
    if (!hoverNode) return null;
    const nodes = new Set([hoverNode]);
    const edges = new Set<string>();
    for (const edge of flow.edges) {
      if (edge.from === hoverNode || edge.to === hoverNode) {
        edges.add(edge.id);
        nodes.add(edge.from);
        nodes.add(edge.to);
      }
    }
    return { nodes, edges };
  }, [hoverNode, flow]);

  const showAllLabels = transform.k >= 0.85;
  const matches = query.trim()
    ? flow.nodes.filter((node) => node.name.includes(query.trim())).slice(0, 8)
    : [];

  const edgePath = (from: FlowNode, to: FlowNode) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const mx = (from.x + to.x) / 2 - dy * 0.12;
    const my = (from.y + to.y) / 2 + dx * 0.12;
    return `M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`;
  };
  const edgeMid = (from: FlowNode, to: FlowNode) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    return { x: (from.x + to.x) / 2 - dy * 0.06, y: (from.y + to.y) / 2 + dx * 0.06 };
  };

  const world = {
    x: -transform.x / transform.k,
    y: -transform.y / transform.k,
    w: (wrapRef.current?.clientWidth || 900) / transform.k,
    h: (wrapRef.current?.clientHeight || 600) / transform.k,
  };
  const mini = { w: 156, h: 100 };
  const miniScale = Math.min(mini.w / (bounds.maxX - bounds.minX), mini.h / (bounds.maxY - bounds.minY));

  return (
    <div className="fg-wrap" ref={wrapRef}>
      <svg
        className="fg-svg"
        onPointerDown={(event) => {
          drag.current = { x: event.clientX - transform.x, y: event.clientY - transform.y };
          (event.target as Element).setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          setTransform((current) => ({ ...current, x: event.clientX - drag.current!.x, y: event.clientY - drag.current!.y }));
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onClick={() => onSelectNode(null)}
      >
        <defs>
          {(Object.keys(EDGE_COLORS) as FlowEdgeKind[]).map((kind) => (
            <marker key={kind} id={`fg-arrow-${kind}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={EDGE_COLORS[kind]} />
            </marker>
          ))}
        </defs>
        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
          {flow.edges.map((edge) => {
            const from = flow.nodes.find((node) => node.id === edge.from);
            const to = flow.nodes.find((node) => node.id === edge.to);
            if (!from || !to) return null;
            const dim = connected && !connected.edges.has(edge.id);
            const labelVisible = showAllLabels || hoverEdge === edge.id || (hoverNode !== null && (edge.from === hoverNode || edge.to === hoverNode));
            const mid = edgeMid(from, to);
            return (
              <g key={edge.id} opacity={dim ? 0.16 : 1}>
                <path d={edgePath(from, to)} fill="none" stroke={EDGE_COLORS[edge.kind]} strokeWidth={hoverEdge === edge.id ? 2.4 : 1.4} markerEnd={`url(#fg-arrow-${edge.kind})`} />
                <path d={edgePath(from, to)} fill="none" stroke="transparent" strokeWidth={14} style={{ pointerEvents: "stroke", cursor: "pointer" }} onPointerEnter={() => setHoverEdge(edge.id)} onPointerLeave={() => setHoverEdge(null)} onClick={(event) => event.stopPropagation()} />
                {labelVisible && (
                  <text x={mid.x} y={mid.y - 6} className="fg-edge-label" fill={EDGE_COLORS[edge.kind]} textAnchor="middle">
                    {EDGE_KIND_LABEL[edge.kind]}
                  </text>
                )}
              </g>
            );
          })}
          {flow.nodes.map((node) => {
            const { w, h } = nodeSize(node);
            const style = NODE_STYLE[node.kind];
            const dim = connected && !connected.nodes.has(node.id);
            const bindable = isBindable(node.kind);
            const count = (bindings[bindingKey(flow.id, node.id)] || []).length;
            const selected = selectedNodeId === node.id;
            const circle = node.kind === "start" || node.kind === "end";
            return (
              <g
                key={node.id}
                transform={`translate(${node.x} ${node.y})`}
                opacity={dim ? 0.22 : 1}
                style={{ cursor: "pointer" }}
                onPointerEnter={() => setHoverNode(node.id)}
                onPointerLeave={() => setHoverNode(null)}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  if (bindable) onSelectNode(node.id);
                  else onInspectNode(node.id);
                }}
              >
                {selected && !circle && <rect x={-w / 2 - 5} y={-h / 2 - 5} width={w + 10} height={h + 10} rx={12} fill="none" stroke="#146abd" strokeWidth={2} />}
                {selected && circle && <circle r={h / 2 + 5} fill="none" stroke="#146abd" strokeWidth={2} />}
                {circle ? (
                  <circle r={h / 2} fill={style.fill} stroke={style.stroke} strokeWidth={1.4} />
                ) : (
                  <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={8} fill={style.fill} stroke={style.stroke} strokeWidth={1.4} strokeDasharray={node.kind === "value" ? "5 4" : undefined} />
                )}
                {circle ? (
                  <text textAnchor="middle" dominantBaseline="central" className="fg-node-name">{node.name}</text>
                ) : (
                  <>
                    {style.chipText && (
                      <rect x={-w / 2 + 9} y={-h / 2 + 9} width={16} height={16} rx={4} fill={style.chip} />
                    )}
                    {style.chipText && (
                      <text x={-w / 2 + 17} y={-h / 2 + 17} textAnchor="middle" dominantBaseline="central" className="fg-chip-text">{style.chipText}</text>
                    )}
                    {!style.chipText && node.kind === "document" && (
                      <rect x={-w / 2 + 9} y={-h / 2 + 10} width={13} height={16} rx={2} fill="none" stroke={style.chip} strokeWidth={1.6} />
                    )}
                    <text x={style.chipText || node.kind === "document" ? -w / 2 + 32 : 0} y={node.linkedModel ? -6 : 0} textAnchor={style.chipText || node.kind === "document" ? "start" : "middle"} dominantBaseline="central" className="fg-node-name">
                      {node.name}
                    </text>
                    {node.linkedModel && (
                      <text x={-w / 2 + 10} y={14} textAnchor="start" className="fg-node-sub">
                        关联模型：{node.linkedModel}
                      </text>
                    )}
                  </>
                )}
                {bindable && (
                  count > 0 ? (
                    <g transform={`translate(${w / 2 - 2} ${-h / 2 + 2})`}>
                      <circle r={10} fill="#146abd" />
                      <text textAnchor="middle" dominantBaseline="central" className="fg-badge-text">{count}</text>
                    </g>
                  ) : (
                    <circle cx={w / 2 - 2} cy={-h / 2 + 2} r={8} fill="#ffffff" stroke="#146abd" strokeWidth={1.6} />
                  )
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <div className="fg-toolbar">
        <button type="button" title="放大" onClick={() => zoomBy(1.2)}><ZoomIn size={16} /></button>
        <button type="button" title="缩小" onClick={() => zoomBy(0.85)}><ZoomOut size={16} /></button>
        <button type="button" title="适应全图" onClick={fit}><Maximize2 size={16} /></button>
      </div>

      <div className="fg-search">
        <Search size={15} />
        <input value={query} placeholder="搜索节点名称" onChange={(event) => setQuery(event.target.value)} />
        {matches.length > 0 && (
          <div className="fg-search-list">
            {matches.map((node) => (
              <button type="button" key={node.id} onClick={() => { centerOn(node.id, 1.1); setQuery(""); if (isBindable(node.kind)) onSelectNode(node.id); }}>
                <span>{NODE_KIND_LABEL[node.kind]}</span>
                <strong>{node.name}</strong>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="fg-minimap" aria-hidden>
        <svg width={mini.w} height={mini.h}>
          {flow.nodes.map((node) => (
            <rect
              key={node.id}
              x={(node.x - bounds.minX) * miniScale}
              y={(node.y - bounds.minY) * miniScale}
              width={isBindable(node.kind) ? 5 : 3}
              height={isBindable(node.kind) ? 4 : 3}
              fill={isBindable(node.kind) ? NODE_STYLE[node.kind].stroke : "#b6c1cd"}
            />
          ))}
          <rect x={(world.x - bounds.minX) * miniScale} y={(world.y - bounds.minY) * miniScale} width={world.w * miniScale} height={world.h * miniScale} fill="rgba(20,106,189,0.12)" stroke="#146abd" strokeWidth={1} />
        </svg>
      </div>

      <button type="button" className="fg-legend-toggle" onClick={() => setLegendOpen((open) => !open)}>
        {legendOpen ? "收起图例" : "图例"}
      </button>
      {legendOpen && (
        <div className="fg-legend">
          <section>
            <h4>节点</h4>
            {(Object.keys(NODE_KIND_LABEL) as FlowNodeKind[]).map((kind) => (
              <p key={kind}><i className={`fg-dot fg-dot--${kind}`} />{NODE_KIND_LABEL[kind]}{isBindable(kind) ? "（可绑定）" : ""}</p>
            ))}
            <p><i className="fg-dot fg-dot--bound" />角标数字 = 已绑智能体数</p>
            <p><i className="fg-dot fg-dot--empty" />空心角标 = 未绑定</p>
          </section>
          <section>
            <h4>连线</h4>
            {(Object.keys(EDGE_KIND_LABEL) as FlowEdgeKind[]).map((kind) => (
              <p key={kind}><i className="fg-line" style={{ background: EDGE_COLORS[kind] }} />{EDGE_KIND_LABEL[kind]}</p>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
