/* Données locales uniquement. Aucun compte, aucune télémétrie. */
(function(root){
const universes=['original','morning','horsebook','clean','garden','bows','minimal','kawaii','ponyrose','stables','country'];
const defaults={theme:'rose',accent:'#93566e',decor:'hearts',layout:'cards',font:'round',size:'16',universe:'original'};
function weekKey(date=new Date()){const d=new Date(date);d.setHours(12,0,0,0);d.setDate(d.getDate()-(d.getDay()+6)%7);return [d.getFullYear(),d.getMonth()+1,d.getDate()].join('-');}
function validate(x){
 if(!x||x.version!==1||!Array.isArray(x.lists)||x.lists.length>100)throw Error('Format de sauvegarde non reconnu.');
 const str=(v,n)=>typeof v==='string'&&v.length<=n;
 const ids=new Set();
 for(const l of x.lists){if(!l||!str(l.id,100)||ids.has(l.id)||!str(l.title,100)||!l.title.trim()||!str(l.icon,8)||!str(l.group,100)||!str(l.note,2000)||!/^#[0-9a-f]{6}$/i.test(l.color)||typeof l.weekly!=='boolean'||!Array.isArray(l.tasks)||l.tasks.length>300||!str(l.week,40))throw Error('Liste invalide.');if(l.visualTheme!==undefined&&!['inherit',...universes].includes(l.visualTheme))throw Error('Thème de liste invalide.');ids.add(l.id);const tids=new Set();for(const t of l.tasks){if(!t||!str(t.id,100)||tids.has(t.id)||!str(t.text,500)||!t.text.trim()||!str(t.time,5)||(t.time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(t.time))||typeof t.done!=='boolean')throw Error('Tâche invalide.');tids.add(t.id);}}
 const s=x.settings||{};for(const [k,values] of Object.entries({theme:['rose','sage','sky','peach'],universe:['original','morning','horsebook','clean','garden','bows','minimal','kawaii','ponyrose','stables','country'],decor:['theme','hearts','stars','none'],layout:['cards','compact'],font:['round','classic','serif','hand'],size:['16','18','20']})){if(s[k]!==undefined&&!values.includes(s[k]))throw Error('Réglage invalide.');}
 if(s.accent!==undefined&&!/^#[0-9a-f]{6}$/i.test(s.accent))throw Error('Couleur invalide.');
 let originalStyle;
 if(s.originalStyle!==undefined){
  const o=s.originalStyle;if(!o||typeof o!=='object'||Array.isArray(o))throw Error('Style initial invalide.');
  originalStyle={};
  for(const [k,values] of Object.entries({theme:['rose','sage','sky','peach'],decor:['theme','hearts','stars','none'],layout:['cards','compact'],font:['round','classic','serif','hand'],size:['16','18','20']})){if(!values.includes(o[k]))throw Error('Style initial invalide.');originalStyle[k]=o[k];}
  if(!/^#[0-9a-f]{6}$/i.test(o.accent))throw Error('Couleur initiale invalide.');originalStyle.accent=o.accent;
 }
 return {version:1,settings:{...defaults,...Object.fromEntries(Object.keys(defaults).filter(k=>s[k]!==undefined).map(k=>[k,s[k]])),...(originalStyle?{originalStyle}:{})},lists:JSON.parse(JSON.stringify(x.lists))};
}
function rollover(state,date=new Date()){let changed=false;const key=weekKey(date);for(const l of state.lists)if(l.weekly&&l.week!==key){l.tasks.forEach(t=>t.done=false);l.week=key;changed=true;}return changed;}
function listTheme(l,settings){return !l.visualTheme||l.visualTheme==='inherit'?settings.universe:l.visualTheme;}
root.MissionsCore={defaults,weekKey,validate,rollover,listTheme};
})(typeof module==='object'?module.exports:globalThis);
