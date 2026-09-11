import type { WorkingGroupNode, WorkingGroupRun } from './types'

export function isBlocking(node: WorkingGroupNode): boolean {
  return node.kind === 'confirm'
}

export function validateRun(run: WorkingGroupRun): string[] {
  const errors: string[] = []
  const memberIds = new Set(run.members.map((m) => m.id))
  const phaseIds = new Set(run.phases.map((p) => p.id))
  const seen = new Set<string>()
  run.nodes.forEach((node) => {
    if (seen.has(node.id)) errors.push(`重复节点 id：${node.id}`)
    seen.add(node.id)
    if (!phaseIds.has(node.phaseId)) errors.push(`${node.id}：无效 phaseId`)
    if (node.actorId !== 'user' && !memberIds.has(node.actorId)) {
      errors.push(`${node.id}：无效 actorId ${node.actorId}`)
    }
    if (node.thinking.length === 0) errors.push(`${node.id}：缺少思维链`)
    if (node.kind === 'dispatch' && !node.dispatch) errors.push(`${node.id}：下发节点缺少 dispatch`)
    if (node.kind === 'produce' && !node.artifact) errors.push(`${node.id}：产出节点缺少 artifact`)
    if (node.kind === 'confirm' && !node.confirm) errors.push(`${node.id}：确认节点缺少 confirm`)
    if ((node.kind === 'speak' || node.kind === 'conclusion') && !node.content) {
      errors.push(`${node.id}：缺少正文`)
    }
    if (node.kind === 'dispatch' && node.dispatch && !memberIds.has(node.dispatch.assigneeId)) {
      errors.push(`${node.id}：下发目标无效 ${node.dispatch.assigneeId}`)
    }
  })
  if (run.edges) {
    run.edges.forEach((edge, i) => {
      if (!seen.has(edge.from)) errors.push(`边 ${i}：无效 from ${edge.from}`)
      if (!seen.has(edge.to)) errors.push(`边 ${i}：无效 to ${edge.to}`)
      if (!edge.condition) errors.push(`边 ${i}：缺少 condition`)
    })
  }
  return errors
}

export function groupNodeIds(run: WorkingGroupRun, node: WorkingGroupNode): string[] {
  if (!node.parallelGroup) return [node.id]
  return run.nodes
    .filter((n) => n.parallelGroup === node.parallelGroup)
    .map((n) => n.id)
}
