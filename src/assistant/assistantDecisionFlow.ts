import type { CollaborationItem } from './mockCollaboration'

export type DecisionCardStatus =
  | 'pending_confirmation'
  | 'superseded'
  | 'resolved'
  | 'deferred'
  | 'cancelled'

export type DecisionSchemaField = {
  key: string
  label: string
  required: boolean
  value: string
  control?: 'text' | 'person' | 'datetime' | 'duration' | 'textarea' | 'readonly'
  options?: Array<{
    value: string
    label: string
    description?: string
  }>
}

export type DecisionSchemaSnapshot = {
  schemaId: string
  schemaVersion: string
  targetSystem: string
  fields: DecisionSchemaField[]
}

export type AssistantDecision =
  | {
      id: string
      kind: 'dispatch'
      title: string
      description: string
      dueAt: string
      priority: CollaborationItem['priority']
      sourceSystem: string
      recordMode: 'c_project_bound' | 'assistant_local'
      schema: DecisionSchemaSnapshot
    }
  | {
      id: string
      kind: 'reminder'
      item: CollaborationItem
      reminderText: string
    }
  | {
      id: string
      kind: 'reminder_receipt'
      item: CollaborationItem
      reminderText: string
    }
  | {
      id: string
      kind: 'task_receipt'
      item: CollaborationItem
      schema: DecisionSchemaSnapshot
      recordMode: 'c_project_bound' | 'assistant_local'
    }
  | {
      id: string
      kind: 'progress_reply'
      item: CollaborationItem
      reminderText: string
    }
  | {
      id: string
      kind: 'workflow_questions'
      workflow: 'risk_review_planning'
    }
