export function createScheduler({jobs,run,limit=()=>1,onError=console.error}) {
  const running=new Set();let scheduled=false;
  function wake() {
    if(scheduled)return;scheduled=true;
    queueMicrotask(()=>{
      scheduled=false;
      const max=Math.max(1,Math.min(3,Number(limit())||1));
      while(running.size<max) {
        const job=jobs().find(j=>j.status==='queued'&&!running.has(j.id));
        if(!job)break;running.add(job.id);
        Promise.resolve().then(()=>run(job)).catch(onError).finally(()=>{running.delete(job.id);wake();});
      }
    });
  }
  return {wake,isRunning:id=>running.has(id)};
}
