/* Données locales uniquement. Aucun compte, aucune télémétrie. */
(function(root){
const defaults={theme:'rose',accent:'#93566e',decor:'hearts',layout:'cards',font:'round',size:'16'};
function weekKey(date=new Date()){const d=new Date(date);d.setHours(12,0,0,0);d.setDate(d.getDate()-(d.getDay()+6)%7);return [d.getFullYear(),d.getMonth()+1,d.getDate()].join('-');}
function validate(x){
 if(!x||x.version!==1||!Array.isArray(x.lists)||x.lists.length>100)throw Error('Format de sauvegarde non reconnu.');
 const str=(v,n)=>typeof v==='string'&&v.length<=n;
 const ids=new Set();
 for(const l of x.lists){if(!l||!str(l.id,100)||ids.has(l.id)||!str(l.title,100)||!l.title.trim()||!str(l.icon,8)||!str(l.group,100)||!str(l.note,2000)||!/^#[0-9a-f]{6}$/i.test(l.color)||typeof l.weekly!=='boolean'||!Array.isArray(l.tasks)||l.tasks.length>300||!str(l.week,40))throw Error('Liste invalide.');ids.add(l.id);const tids=new Set();for(const t of l.tasks){if(!t||!str(t.id,100)||tids.has(t.id)||!str(t.text,500)||!t.text.trim()||!str(t.time,5)||(t.time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(t.time))||typeof t.done!=='boolean')throw Error('Tâche invalide.');tids.add(t.id);}}
 const s=x.settings||{};for(const [k,values] of Object.entries({theme:['rose','sage','sky','peach'],decor:['hearts','stars','none'],layout:['cards','compact'],font:['round','classic'],size:['16','18','20']})){if(s[k]!==undefined&&!values.includes(s[k]))throw Error('Réglage invalide.');}
 if(s.accent!==undefined&&!/^#[0-9a-f]{6}$/i.test(s.accent))throw Error('Couleur invalide.');
 return {version:1,settings:{...defaults,...Object.fromEntries(Object.keys(defaults).filter(k=>s[k]!==undefined).map(k=>[k,s[k]]))},lists:JSON.parse(JSON.stringify(x.lists))};
}
function rollover(state,date=new Date()){let changed=false;const key=weekKey(date);for(const l of state.lists)if(l.weekly&&l.week!==key){l.tasks.forEach(t=>t.done=false);l.week=key;changed=true;}return changed;}
root.MissionsCore={defaults,weekKey,validate,rollover};
})(typeof module==='object'?module.exports:globalThis);
