'use strict';
(function(){
const CONFIG_KEY='mm-family-config',BIND_KEY='mm-family-binding';
let client=null,session=null,remote=null,ready=false,dirty=false,busy=false,conflict=false,errorText='',invite=null,sequence=0,timer=null;
let binding=null;try{binding=JSON.parse(localStorage.getItem(BIND_KEY)||'null');}catch{}
function writeBinding(){if(!session||!remote)return;binding={familyId:remote.family_id,userId:session.user.id,revision:remote.revision,dirty};localStorage.setItem(BIND_KEY,JSON.stringify(binding));}
function errorMessage(e){const text=e?.message||String(e);if(text.includes('SYNC_CONFLICT'))return 'Une autre session a modifié les données. La synchronisation est suspendue pour éviter un écrasement.';if(text.includes('INVALID_INVITE'))return 'Code de rattachement invalide ou expiré.';if(text.includes('CHILD_EXISTS'))return 'Un compte enfant est déjà rattaché à cette famille.';if(text.includes('ALREADY_MEMBER'))return 'Ce compte appartient déjà à une famille.';if(text.includes('Invalid login credentials'))return 'Identifiant ou mot de passe incorrect.';if(text.includes('PARENT_REQUIRED')||text.includes('CHILD_REQUIRED'))return 'Cette action n’est pas autorisée pour ce compte.';return 'Connexion impossible pour le moment. Vérifie Internet et la configuration du projet.';}
async function call(name,args={}){const result=await client.rpc(name,args);if(result.error)throw result.error;return result.data;}
function exportBeforeReplace(){if(!state.lists.length)return;const data=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'})),a=el('a');a.href=data;a.download='mes-missions-avant-rattachement-'+dayKey()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(data),1000);}
async function useRemote(){if(!remote?.payload)return;const next=validate(remote.payload);exportBeforeReplace();state=next;dirty=false;conflict=false;ready=true;writeBinding();render();save();panel();}
async function startSharing(){ready=true;dirty=true;conflict=false;writeBinding();await flush();panel();}
function queue(){if(!ready||remote?.role!=='child'||!session||conflict)return;dirty=true;sequence++;writeBinding();clearTimeout(timer);timer=setTimeout(flush,700);}
async function flush(){
 if(!ready||remote?.role!=='child'||!dirty||busy||conflict)return;busy=true;const sentSequence=sequence;
 try{MissionsHistory.capture(state);const snapshot=JSON.parse(JSON.stringify(state)),revision=await call('mm_write',{p_payload:snapshot,p_expected:remote.revision});remote={...remote,payload:snapshot,revision,updated_at:new Date().toISOString()};dirty=sequence!==sentSequence;errorText='';writeBinding();}
 catch(e){if((e?.message||'').includes('SYNC_CONFLICT')){conflict=true;ready=false;}errorText=errorMessage(e);}
 finally{busy=false;panel();if(dirty&&!conflict&&ready){clearTimeout(timer);timer=setTimeout(flush,errorText?15000:700);}}
}
async function bootstrap(){
 const data=await call('mm_bootstrap');if(data?.payload)data.payload=validate(data.payload);remote=data;errorText='';
 if(remote?.role==='child'){
 const same=binding?.familyId===remote.family_id&&binding?.userId===session.user.id;
 if(same&&binding.revision===remote.revision){ready=true;dirty=!!binding.dirty;queue();}
 else if(same&&binding.revision!==remote.revision){conflict=true;ready=false;errorText='La version familiale a changé sur un autre appareil. Sauvegarde puis récupère les données synchronisées.';}
 else{ready=false;dirty=false;conflict=false;}
 }else{ready=false;dirty=false;conflict=false;}
 panel();if(remote?.role==='parent'&&!$('parentDialog').open)$('parentDialog').showModal();
}
async function run(fn){try{errorText='';await fn();}catch(e){errorText=errorMessage(e);}panel();}
function field(form,label,type='text',value=''){const l=el('label',null,label),input=el('input');input.type=type;input.value=value;l.append(input);form.append(l);return input;}
function checkConfig(config){const url=(config.url||'').trim().replace(/\/$/,'');const key=(config.publishableKey||'').trim();if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url))throw Error('BAD_CONFIG');if(key.startsWith('sb_secret_'))throw Error('BAD_CONFIG');if(!key.startsWith('sb_publishable_')){try{const part=key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');if(JSON.parse(atob(part)).role!=='anon')throw Error();}catch{throw Error('BAD_CONFIG');}}return {url,publishableKey:key};}
async function connect(config){const c=checkConfig(config);client=supabase.createClient(c.url,c.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'mm-auth-'+new URL(c.url).hostname}});localStorage.setItem(CONFIG_KEY,JSON.stringify(c));const result=await client.auth.getSession();session=result.data?.session||null;if(session)await bootstrap();else panel();}
function panel(){
 const box=$('familyPanel');box.replaceChildren();const familyBox=el('div','family-box');box.append(familyBox);
 if(errorText)familyBox.append(el('p','sync-status',errorText));
 if(!client){familyBox.append(el('h3',null,'Activer le suivi à distance'),el('p','small','Renseigne les paramètres publics de ton projet Supabase, après installation de la base familiale. Aucune donnée familiale n’est publiée sur GitHub.'));const form=el('form'),url=field(form,'URL du projet','url'),key=field(form,'Clé publique publishable (ou anon)','text');url.required=key.required=true;const submit=el('button','primary','Enregistrer la connexion');submit.type='submit';form.append(submit);form.onsubmit=e=>{e.preventDefault();run(()=>connect({url:url.value,publishableKey:key.value}));};familyBox.append(form);}
 else if(!session){familyBox.append(el('h3',null,'Connexion familiale'),el('p','small','Les comptes sont créés par le parent dans son projet Supabase. Chaque personne utilise son compte.'));const form=el('form'),email=field(form,'Identifiant du compte','email'),password=field(form,'Mot de passe','password');email.required=password.required=true;email.autocomplete='username';password.autocomplete='current-password';const submit=el('button','primary','Se connecter');submit.type='submit';form.append(submit);form.onsubmit=e=>{e.preventDefault();submit.disabled=true;run(async()=>{const r=await client.auth.signInWithPassword({email:email.value.trim(),password:password.value});password.value='';if(r.error)throw r.error;session=r.data.session;await bootstrap();}).finally(()=>submit.disabled=false);};familyBox.append(form);}
 else{
 familyBox.append(el('p','small','Compte connecté : '+session.user.email));
 if(!remote){familyBox.append(el('p','small','Aucune famille rattachée à ce compte.'));const create=el('form'),name=field(create,'Nom de l’espace familial','text','Ma famille'),b=el('button','primary','Créer l’espace parental');name.required=true;name.maxLength=100;b.type='submit';create.append(b);create.onsubmit=e=>{e.preventDefault();run(async()=>{await call('mm_create_family',{p_name:name.value});await bootstrap();});};familyBox.append(create);const join=el('form'),code=field(join,'Ou code de rattachement reçu d’un parent'),jb=el('button',null,'Rejoindre la famille');jb.type='submit';join.append(jb);join.onsubmit=e=>{e.preventDefault();run(async()=>{await call('mm_join_family',{p_token:code.value.trim()});await bootstrap();});};familyBox.append(join);}
 else{
 familyBox.append(el('h3',null,remote.name),el('p','small',remote.role==='parent'?'Accès parental · consultation':'Compte enfant · listes synchronisées'));
 if(remote.role==='parent'){
 familyBox.append(el('p','sync-status',remote.updated_at?'Dernière réception : '+new Date(remote.updated_at).toLocaleString('fr-FR'):'Aucune liste reçue du compte enfant.'));
 const actions=el('div','family-actions');if(!remote.child_connected)actions.append(btn('Créer un code pour Annabelle',()=>run(async()=>{invite={role:'enfant',code:await call('mm_create_invite',{p_role:'child'})};})));
 actions.append(btn('Inviter un autre parent',()=>run(async()=>{invite={role:'parent',code:await call('mm_create_invite',{p_role:'parent'})};})),btn('Actualiser',()=>run(bootstrap)),btn('Annuler les codes en attente',()=>run(async()=>{await call('mm_revoke_invites');invite=null;})));familyBox.append(actions);
 if(invite){familyBox.append(el('p','small','Code '+invite.role+' · valable 24 heures, pour un seul rattachement. Transmets-le en privé.'),el('p','invite-code',invite.code));}
 }else{
 familyBox.append(el('p','sync-status',conflict?'Synchronisation suspendue.':busy?'Envoi en cours…':dirty?'Modifications à envoyer.':remote.updated_at?'Dernière synchronisation : '+new Date(remote.updated_at).toLocaleString('fr-FR'):'Aucune synchronisation effectuée.'));
 if(!ready){if(remote.payload)familyBox.append(btn('Sauvegarder ici puis récupérer les données familiales',()=>run(useRemote),'primary'));else familyBox.append(btn('Partager les listes de cet appareil avec ma famille',()=>run(startSharing),'primary'));}
 else familyBox.append(btn('Synchroniser maintenant',()=>{queue();run(flush);}));
 if(conflict)familyBox.append(btn('Recharger la version familiale disponible',()=>run(async()=>{const r=await call('mm_bootstrap');if(r.payload)r.payload=validate(r.payload);remote=r;panel();})));
 }
 }
 familyBox.append(btn('Se déconnecter',()=>run(async()=>{clearTimeout(timer);ready=false;await client.auth.signOut({scope:'local'});session=null;remote=null;invite=null;conflict=false;dirty=false;})));
 }
 if(remote?.role==='parent')renderDashboard(remote.payload);else{if(!session||!remote)familyBox.append(el('p','small','Ci-dessous : données de ce navigateur uniquement, tant que la connexion familiale n’est pas active.'));renderDashboard(state);}
}
$('parents').onclick=()=>{panel();$('parentDialog').showModal();};
globalThis.MissionsFamily={queue,flush};
let config=window.MISSIONS_CONFIG;try{if(!config?.url)config=JSON.parse(localStorage.getItem(CONFIG_KEY)||'null');}catch{}
if(config?.url)run(()=>connect(config));
setInterval(async()=>{if(!client||!session||document.hidden)return;if(remote?.role==='parent'){try{const data=await call('mm_bootstrap');if(!data){remote=null;panel();return;}if(data.payload)data.payload=validate(data.payload);remote=data;errorText='';if($('parentDialog').open)panel();}catch(e){errorText=errorMessage(e);if($('parentDialog').open)panel();}}else if(dirty&&!conflict)flush();},20000);
window.addEventListener('online',()=>{if(dirty&&!conflict)flush();});
})();
