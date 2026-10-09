export type A2ASettings = { clarify: boolean; progress: boolean; deliver: boolean };
export const DEFAULT_A2A_SETTINGS: A2ASettings = { clarify: true, progress: true, deliver: false };
export const A2A_OPTIONS: { key: keyof A2ASettings; title: string; automatic: string; manual: string; description: string }[] = [
  { key: 'clarify', title: '补充信息追问', automatic: '允许自动追问', manual: '发送前由我确认', description: '仅向本次协作参与人询问缺失信息，不自动附带个人资料或成果文件。' },
  { key: 'progress', title: '进展回复', automatic: '允许自动回复已核实进展', manual: '发送前由我确认', description: '仅回复有依据的处理进展；不代你承诺交付时间，不把消息送达说成业务任务完成。' },
  { key: 'deliver', title: '成果发送', automatic: '允许自动发送给本次协作参与人', manual: '发送前由我确认', description: '仅发送本次协作明确要求、接收人有权查看的成果。新增接收人或发送范围不清时，仍先由你确认。' },
];
export function settingsKey(userId: string) { return `comac-a2a-settings-v1:${userId}`; }
export function readA2ASettings(userId: string): A2ASettings {
  try {
    const saved = JSON.parse(localStorage.getItem(settingsKey(userId)) || 'null');
    return Object.fromEntries(A2A_OPTIONS.map(({ key }) => [key, typeof saved?.[key] === 'boolean' ? saved[key] : DEFAULT_A2A_SETTINGS[key]])) as A2ASettings;
  } catch { return { ...DEFAULT_A2A_SETTINGS }; }
}
export const sameSettings = (a: A2ASettings, b: A2ASettings) => A2A_OPTIONS.every(({ key }) => a[key] === b[key]);
