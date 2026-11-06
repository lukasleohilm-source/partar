// Keyrt í <body> áður en React fer í gang, svo `beforeinstallprompt` glatist ekki.
// Ekki "use client": layout (server) þarf strenginn sjálfan.
export const INSTALL_EVENT = "partar-install";

export const INSTALL_LISTENER = `window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__partarInstall=e;window.dispatchEvent(new Event("${INSTALL_EVENT}"))});window.addEventListener("appinstalled",function(){window.__partarInstall=null;try{localStorage.setItem("partar_installed","1")}catch(_){}window.dispatchEvent(new Event("${INSTALL_EVENT}"))});`;
