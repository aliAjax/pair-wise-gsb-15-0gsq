import type {Instance,TimelineEvent} from '../src/types';
import {domains,managers,users} from './catalog';
const events=(i:number):TimelineEvent[]=>{
 const approval:TimelineEvent={title:'直属主管审批',time:'10:24',status:i%3===0?'current':'completed',kind:'approval'};
 if(i===10){// 历史实例：周礼的主管陈默在财务域委托生效期间由王宁代办签字，撤销/到期后签字仍保留
  approval.signedBy='王宁';approval.signedVia='陈默';approval.time='10:40';
 }else if(approval.status==='completed'){approval.signedBy=managers[users[i%8]];}
 return [{title:'提交申请',time:'09:10',status:'completed',kind:'submit'},approval,{title:'金额判断',time:'11:05',status:i%3!==0?'current':'pending',kind:'condition'}];
};
export const instances:Instance[]=Array.from({length:80},(_,i)=>{const status:Instance['status']=i<12?'abnormal':i<22?'timeout':i<50?'running':'completed'; return {id:`INS-2026-${String(i+1).padStart(4,'0')}`,workflowId:`wf-${i%12+1}`,applicant:users[i%8],domain:domains[i%5],currentNode:i%3===0?'直属主管审批':'金额判断',status,submittedAt:i===10?'2026-09-16 09:10':`2026-07-${String(10-i%9).padStart(2,'0')} ${String(8+i%10).padStart(2,'0')}:10`,duration:status==='timeout'?`${28+i}h`:`${i%9+1}h ${i%6*10}m`,risk:i<22?'high':i<45?'medium':'low',timeline:events(i)};});
