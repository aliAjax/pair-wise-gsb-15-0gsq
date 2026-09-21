export type WorkflowStatus='draft'|'published'|'archived';
export type NodeKind='start'|'form'|'approval'|'condition'|'automation'|'notify'|'end';
export type NodeState='unconfigured'|'configuring'|'valid'|'invalid';
export interface FormField {id:string;label:string;type:'text'|'number'|'amount'|'date'|'select'|'attachment';required:boolean;options?:string[]}
export interface FlowNode {id:string;type:NodeKind;position:{x:number;y:number};data:{label:string;state:NodeState;config:Record<string,any>}}
export interface FlowEdge {id:string;source:string;target:string;label?:string}
export interface Version {version:number;createdAt:string;note:string;nodes:FlowNode[];edges:FlowEdge[]}
export interface Workflow {id:string;name:string;domain:string;status:WorkflowStatus;version:number;editor:string;updatedAt:string;publishedAt?:string;abnormalCount:number;nodes:FlowNode[];edges:FlowEdge[];versions:Version[]}
export type DelegationState='active'|'revoked';
/** 审批委托：员工针对一个业务域，把自己在时段内的人工审批委托给受托人 */
export interface Delegation {id:string;delegator:string;delegate:string;domain:string;start:string;end:string;reason:string;status:DelegationState;createdAt:string;revokedAt?:string}
export interface TimelineEvent {title:string;time:string;status:string;kind?:'submit'|'approval'|'condition';/** 已产生的人工审批签字人，撤销委托不会回改 */signedBy?:string;/** 该签字经由谁的委托关系产生（名义审批人） */signedVia?:string}
export interface Instance {id:string;workflowId:string;applicant:string;domain:string;currentNode:string;status:'abnormal'|'timeout'|'running'|'completed';submittedAt:string;duration:string;risk:'high'|'medium'|'low';timeline:TimelineEvent[]}
export interface ValidationIssue {nodeId:string;level:'error'|'warning';message:string}
