import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import {
  EDGE_KIND_LABEL,
  bindingKey,
  isBindable,
  type FlowEdge,
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
  // 可绑定节点用更饱和的描边，与只读上下文拉开视觉层级
  value: { stroke: "#22a3b8", fill: "#f2fbfd", chip: "#22a3b8", chipText: "V" },
  activity: { stroke: "#e07a48", fill: "#fdf6f1", chip: "#e07a48", chipText: "P" },
  "org-owner": { stroke: "#c0b0e2", fill: "#f8f6fc", chip: "#9077c9", chipText: "D" },
  "org-resource": { stroke: "#a7b3c0", fill: "#f6f8fa", chip: "#7d8b99", chipText: "R" },
  document: { stroke: "#a3c98a", fill: "#f6fbf1", chip: "#6da24e", chipText: "" },
  start: { stroke: "#9aa7b5", fill: "#ffffff", chip: "", chipText: "" },
  end: { stroke: "#9aa7b5", fill: "#ffffff", chip: "", chipText: "" },
};

/** 芯片最多显示字数：由卡片宽度决定，尽量显示全名 */
const chipMaxChars = (cardWidth: number) => Math.max(4, Math.floor((cardWidth - 44) / 10.5));
const chipWidth = (name: string, maxChars: number) => Math.min(name.length, maxChars) * 10.5 + 24;

/** 芯片按卡片可用宽度贪心分行，最多两行；nodeSize 与渲染共用，保证高度一致 */
function chipLayout(names: string[], cardWidth: number, maxChars: number): string[][] {
  const budget = cardWidth - 20;
  const rows: string[][] = [];
  let row: string[] = [];
  let rowW = 0;
  for (const nm of names) {
    const cw = chipWidth(nm, maxChars) + 5;
    if (row.length && rowW + cw > budget) {
      rows.push(row);
      row = [];
      rowW = 0;
      if (rows.length === 2) return rows;
    }
    row.push(nm);
    rowW += cw;
  }
  if (row.length && rows.length < 2) rows.push(row);
  return rows;
}

function nodeSize(node: FlowNode, chipNames?: string[]) {
  if (node.kind === "start" || node.kind === "end") return { w: 68, h: 68 };
  // 名称与「关联模型」副行都参与定宽，尽量整行放下，放不下再折行截断
  const subW = node.linkedModel ? (node.linkedModel.length + 5) * 10 + 24 : 0;
  const w = Math.min(236, Math.max(116, node.name.length * 13 + 44, subW));
  const rows = chipNames ? chipLayout(chipNames, w, chipMaxChars(w)).length : 0;
  const h = (isBindable(node.kind) ? 66 : 46) + rows * 22;
  return { w, h };
}

/** 估算文本宽度：CJK ≈ 1em，拉丁/数字 ≈ 0.56em，超出折行宽度则截断加省略号 */
function fitText(text: string, maxWidth: number, fontSize: number): string {
  const widthOf = (ch: string) =>
    (/[⺀-鿿　-〿＀-｠가-힯]/.test(ch) ? 1 : 0.56) * fontSize;
  let total = 0;
  for (const ch of text) total += widthOf(ch);
  if (total <= maxWidth) return text;
  let acc = 0;
  let out = "";
  for (const ch of text) {
    const w = widthOf(ch);
    if (acc + w > maxWidth - fontSize * 0.8) break;
    out += ch;
    acc += w;
  }
  return `${out}…`;
}

/** 从节点中心朝 (tx,ty) 方向求边界交点，让连线端点停在形状外沿而不是穿过卡片 */
function boundaryPoint(
  node: FlowNode,
  size: { w: number; h: number },
  tx: number,
  ty: number,
  gap: number,
) {
  const dx = tx - node.x;
  const dy = ty - node.y;
  if (node.kind === "start" || node.kind === "end") {
    const dist = Math.hypot(dx, dy) || 1;
    const r = size.h / 2 + gap;
    return { x: node.x + (dx / dist) * r, y: node.y + (dy / dist) * r };
  }
  const hw = size.w / 2 + gap;
  const hh = size.h / 2 + gap;
  const sx = dx === 0 ? Infinity : hw / Math.abs(dx);
  const sy = dy === 0 ? Infinity : hh / Math.abs(dy);
  const s = Math.min(sx, sy);
  if (!isFinite(s)) return { x: node.x + hw, y: node.y };
  return { x: node.x + dx * s, y: node.y + dy * s };
}

type Transform = { x: number; y: number; k: number };

export default function FlowGraphCanvas({
  flow,
  bindings,
  roleNames,
  selectedNodeId,
  onSelectNode,
  focusNodeId,
  focusNonce,
}: {
  flow: ValueFlow;
  bindings: Record<string, string[]>;
  roleNames: Record<string, string>;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  focusNodeId: string | null;
  focusNonce: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<Transform>({ x: 40, y: 40, k: 0.6 });
  const [hoverNode, setHoverNode] = useState<string | null>(null);
  const [hoverEdge, setHoverEdge] = useState<string | null>(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow.id]);

  // 容器尺寸变化（如绑定面板开合）时重新适应全图，避免节点被裁切
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let last = { w: el.clientWidth, h: el.clientHeight };
    const observer = new ResizeObserver(() => {
      const { clientWidth: w, clientHeight: h } = el;
      if (Math.abs(w - last.w) < 24 && Math.abs(h - last.h) < 24) return;
      const prev = last;
      last = { w, h };
      // 容器尺寸变化（开合绑定面板、窗口缩放）时保持视野：
      // 原容器中心对应的世界点仍居中，缩放比不变。不重置用户已调好的位置。
      setTransform((current) => {
        const wx = (prev.w / 2 - current.x) / current.k;
        const wy = (prev.h / 2 - current.y) / current.k;
        return { ...current, x: w / 2 - wx * current.k, y: h / 2 - wy * current.k };
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
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

  const nodeById = useMemo(
    () => new Map(flow.nodes.map((node) => [node.id, node])),
    [flow],
  );
  const roleName = (roleId: string) => roleNames[roleId] || roleId;

  const sizeById = useMemo(
    () =>
      new Map(
        flow.nodes.map((node) => {
          const names = (bindings[bindingKey(flow.id, node.id)] || []).map(roleName);
          return [node.id, nodeSize(node, names)];
        }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flow, bindings, roleNames],
  );

  /**
   * 边几何：
   * - 端点裁剪到节点边界（矩形/圆求交），箭头不再被卡片盖住；
   * - 同一对节点间的多条边（平行/双向）按组分配弯曲偏移，避免重叠；
   * - 弯曲量随距离自适应并设上下限，长边不再甩出大弧。
   */
  const edgeGeoms = useMemo(() => {
    const pairKey = (edge: FlowEdge) =>
      edge.from < edge.to ? `${edge.from}\u0000${edge.to}` : `${edge.to}\u0000${edge.from}`;
    const totals = new Map<string, number>();
    for (const edge of flow.edges) {
      const key = pairKey(edge);
      totals.set(key, (totals.get(key) || 0) + 1);
    }
    const seen = new Map<string, number>();
    const geoms = new Map<string, { d: string; mid: { x: number; y: number } }>();
    for (const edge of flow.edges) {
      const from = nodeById.get(edge.from);
      const to = nodeById.get(edge.to);
      const fromSize = sizeById.get(edge.from);
      const toSize = sizeById.get(edge.to);
      if (!from || !to || !fromSize || !toSize) continue;
      const key = pairKey(edge);
      const idx = seen.get(key) || 0;
      seen.set(key, idx + 1);
      const total = totals.get(key) || 1;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.hypot(dx, dy) || 1;
      const base = Math.min(46, Math.max(14, dist * 0.12));
      const bend = total === 1 ? base : base * 0.55 + (idx - (total - 1) / 2) * 34;
      const cx = (from.x + to.x) / 2 + (-dy / dist) * bend;
      const cy = (from.y + to.y) / 2 + (dx / dist) * bend;
      const start = boundaryPoint(from, fromSize, cx, cy, 3);
      const end = boundaryPoint(to, toSize, cx, cy, 5);
      geoms.set(edge.id, {
        d: `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`,
        mid: {
          x: 0.25 * start.x + 0.5 * cx + 0.25 * end.x,
          y: 0.25 * start.y + 0.5 * cy + 0.25 * end.y,
        },
      });
    }
    return geoms;
  }, [flow, nodeById, sizeById]);

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

  // 缩放分级显示标签：全图视野只保留结构，中距显示执行顺序，近距显示全部。
  // 阈值按「屏幕像素下 10px 字号是否还可读」定，避免 fit 大图时糊成一片。
  const showAllLabels = transform.k >= 0.8;
  const showFlowLabels = transform.k >= 0.62;
  // 线宽随缩小做平方根补偿：fit 大图时线条仍保持可读的屏幕像素宽度
  const strokeScale = Math.min(1.8, Math.max(1, 1 / Math.sqrt(transform.k)));
  const nodeStrokeScale = Math.min(1.5, strokeScale);

  // 小地图交互：点击/拖动把视野中心移到对应世界坐标
  const miniPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const el = wrapRef.current;
    const svg = minimapRef.current?.querySelector("svg");
    if (!el || !svg) return;
    const rect = svg.getBoundingClientRect();
    const wx = (event.clientX - rect.left) / miniScale + bounds.minX;
    const wy = (event.clientY - rect.top) / miniScale + bounds.minY;
    const view = el.getBoundingClientRect();
    setTransform((current) => ({
      ...current,
      x: view.width / 2 - wx * current.k,
      y: view.height / 2 - wy * current.k,
    }));
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
    <div className="fd-canvas-block">
    <div className="fg-wrap" ref={wrapRef}>
      <svg
        className="fg-svg"
        onPointerDown={(event) => {
          drag.current = { x: event.clientX - transform.x, y: event.clientY - transform.y };
          (event.target as Element).setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const origin = drag.current;
          if (!origin) return;
          const nextX = event.clientX - origin.x;
          const nextY = event.clientY - origin.y;
          setTransform((current) => ({ ...current, x: nextX, y: nextY }));
        }}
        onPointerUp={() => {
          drag.current = null;
        }}

      >
        <defs>
          {(Object.keys(EDGE_COLORS) as FlowEdgeKind[]).map((kind) => (
            <marker key={kind} id={`fg-arrow-${kind}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={EDGE_COLORS[kind]} />
            </marker>
          ))}
          <filter id="fg-card-shadow" x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" floodColor="#1d3a5c" floodOpacity="0.16" />
          </filter>
          <pattern id="fg-dots" width="26" height="26" patternUnits="userSpaceOnUse">
            <circle cx="1.3" cy="1.3" r={Math.min(4.5, 1.5 / transform.k)} fill="#cfd9e5" />
          </pattern>
        </defs>
        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
          <rect
            x={bounds.minX - 4000}
            y={bounds.minY - 4000}
            width={bounds.maxX - bounds.minX + 8000}
            height={bounds.maxY - bounds.minY + 8000}
            fill="url(#fg-dots)"
            pointerEvents="none"
          />
          {flow.edges.map((edge) => {
            const geom = edgeGeoms.get(edge.id);
            if (!geom) return null;
            const dim = connected && !connected.edges.has(edge.id);
            const emphasized =
              hoverEdge === edge.id ||
              (!!hoverNode && (edge.from === hoverNode || edge.to === hoverNode)) ||
              (!!selectedNodeId && (edge.from === selectedNodeId || edge.to === selectedNodeId));
            const labelVisible =
              showAllLabels ||
              (showFlowLabels && edge.kind === "flow") ||
              emphasized;
            const baseWidth = (edge.kind === "flow" ? 2.2 : 1.3) * strokeScale;
            const flowing =
              !!selectedNodeId && (edge.from === selectedNodeId || edge.to === selectedNodeId);
            return (
              <g key={edge.id} opacity={dim ? 0.18 : 1}>
                <path d={geom.d} fill="none" stroke={EDGE_COLORS[edge.kind]} strokeWidth={emphasized ? baseWidth + 0.9 : baseWidth} strokeOpacity={flowing ? 0.18 : 1} markerEnd={`url(#fg-arrow-${edge.kind})`} />
                {flowing && (
                  <path
                    d={geom.d}
                    fill="none"
                    stroke={EDGE_COLORS[edge.kind]}
                    strokeWidth={baseWidth + 0.7}
                    strokeLinecap="round"
                    strokeDasharray="9 8"
                    className="fg-flow-anim"
                    pointerEvents="none"
                  />
                )}
                <path d={geom.d} fill="none" stroke="transparent" strokeWidth={14} style={{ pointerEvents: "stroke", cursor: "pointer" }} onPointerEnter={() => setHoverEdge(edge.id)} onPointerLeave={() => setHoverEdge(null)} onClick={(event) => event.stopPropagation()}>
                  <title>{`${EDGE_KIND_LABEL[edge.kind]}：${nodeById.get(edge.from)?.name || edge.from} → ${nodeById.get(edge.to)?.name || edge.to}`}</title>
                </path>
                {labelVisible && (
                  <text x={geom.mid.x} y={geom.mid.y - 6} className="fg-edge-label" fill={EDGE_COLORS[edge.kind]} textAnchor="middle">
                    {EDGE_KIND_LABEL[edge.kind]}
                  </text>
                )}
              </g>
            );
          })}
          {flow.nodes.map((node) => {
            const { w, h } = sizeById.get(node.id) || nodeSize(node);
            const style = NODE_STYLE[node.kind];
            const dim = connected && !connected.nodes.has(node.id);
            const bindable = isBindable(node.kind);
            const count = (bindings[bindingKey(flow.id, node.id)] || []).length;
            const selected = selectedNodeId === node.id;
            const hovered = hoverNode === node.id;
            const circle = node.kind === "start" || node.kind === "end";
            const name = fitText(node.name, w - (circle ? 14 : 40), 13);
            const sub = node.linkedModel ? fitText(`关联模型：${node.linkedModel}`, w - 24, 10) : null;
            const nameY = -h / 2 + (sub ? 26 : 33);
            const subY = -h / 2 + 47;
            const textX = circle ? 0 : -w / 2 + 32;
            const boundIds = bindable ? bindings[bindingKey(flow.id, node.id)] || [] : [];
            const boundNames = boundIds.map(roleName);
            const maxChars = chipMaxChars(w);
            const chipRowsLayout = chipLayout(boundNames, w, maxChars);
            const chipRows = chipRowsLayout.length;
            const overflow = boundNames.length - chipRowsLayout.flat().length;
            const tip = `${node.name}${node.linkedModel ? ` · 关联模型：${node.linkedModel}` : ""}\n${
              bindable
                ? count
                  ? `已绑定 ${count} 个岗位智能体 · 点击配置绑定`
                  : "待配置 · 点击绑定岗位智能体"
                : "只读上下文 · 悬停查看关联"
            }`;
            return (
              <g
                key={node.id}
                transform={`translate(${node.x} ${node.y})`}
                opacity={dim ? 0.3 : 1}
                style={{ cursor: bindable ? "pointer" : "default" }}
                onPointerEnter={() => setHoverNode(node.id)}
                onPointerLeave={() => setHoverNode(null)}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  if (!bindable) return;
                  event.stopPropagation();
                  onSelectNode(node.id);
                }}
              >
                <title>{tip}</title>
                {selected && !circle && <rect x={-w / 2 - 6} y={-h / 2 - 6} width={w + 12} height={h + 12} rx={12} fill="none" stroke="#146abd" strokeWidth={2.4} />}
                {selected && circle && <circle r={h / 2 + 6} fill="none" stroke="#146abd" strokeWidth={2.4} />}
                {bindable && count === 0 && !selected && (
                  <rect className="fg-todo-ring" style={{ strokeWidth: 1.6 * nodeStrokeScale }} x={-w / 2 - 4} y={-h / 2 - 4} width={w + 8} height={h + 8} rx={11} />
                )}
                {circle ? (
                  <circle r={h / 2} fill={style.fill} stroke={style.stroke} strokeWidth={(hovered ? 2.4 : 1.4) * nodeStrokeScale} />
                ) : (
                  <rect
                    x={-w / 2}
                    y={-h / 2}
                    width={w}
                    height={h}
                    rx={8}
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth={(hovered ? (bindable ? 3 : 2.2) : bindable ? 2 : 1.2) * nodeStrokeScale}
                    filter={bindable ? "url(#fg-card-shadow)" : undefined}
                  />
                )}
                {circle ? (
                  <text textAnchor="middle" dominantBaseline="central" className="fg-node-name">{name}</text>
                ) : (
                  <>
                    {style.chipText && (
                      <rect x={-w / 2 + 9} y={nameY - 8} width={16} height={16} rx={4} fill={style.chip} />
                    )}
                    {style.chipText && (
                      <text x={-w / 2 + 17} y={nameY} textAnchor="middle" dominantBaseline="central" className="fg-chip-text">{style.chipText}</text>
                    )}
                    {!style.chipText && node.kind === "document" && (
                      <rect x={-w / 2 + 10} y={nameY - 8} width={13} height={16} rx={2} fill="none" stroke={style.chip} strokeWidth={1.6} />
                    )}
                    <text x={textX} y={nameY} textAnchor={circle ? "middle" : "start"} dominantBaseline="central" className={bindable ? "fg-node-name" : "fg-node-name fg-node-name--ctx"}>
                      {name}
                    </text>
                    {sub && (
                      <text x={-w / 2 + 12} y={subY} textAnchor="start" className="fg-node-sub">
                        {sub}
                      </text>
                    )}
                    {chipRows > 0 &&
                      chipRowsLayout.flatMap((rowNames, row) => {
                        const rowBottom = h / 2 - 6 - (chipRows - 1 - row) * 22;
                        let x = -w / 2 + 10;
                        return rowNames.map((chipName, col) => {
                          const cw = chipWidth(chipName, maxChars);
                          const cx = x;
                          x += cw + 5;
                          const isLast = row === chipRows - 1 && col === rowNames.length - 1;
                          return (
                            <g key={chipName + row + col} transform={`translate(${cx} ${rowBottom - 17})`}>
                              <rect width={cw} height={17} rx={8.5} fill="#e8f2fc" stroke="#b9d4ee" strokeWidth={0.8} />
                              <circle cx={8} cy={8.5} r={2.6} fill="#146abd" />
                              <text x={14} y={8.5} dominantBaseline="central" className="fg-chip-name">
                                {chipName.length > maxChars ? `${chipName.slice(0, maxChars)}…` : chipName}
                              </text>
                              {isLast && overflow > 0 && (
                                <text x={cw + 8} y={8.5} dominantBaseline="central" className="fg-chip-more">+{overflow}</text>
                              )}
                            </g>
                          );
                        });
                      })}
                  </>
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

      <div
        className="fg-minimap"
        ref={minimapRef}
        role="img"
        aria-label="缩略导航图，点击或拖动可移动视野"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          miniPan(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) miniPan(event);
        }}
      >
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
    </div>
    </div>
  );
}
