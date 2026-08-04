const KEY = "rigzer_after_login_redirect";

export function saveRedirect(url: string) {
  sessionStorage.setItem(KEY, url);
}

export function getRedirect() {
  return sessionStorage.getItem(KEY);
}

export function clearRedirect() {
  sessionStorage.removeItem(KEY);
}

export function consumeRedirect() {
  const redirect = sessionStorage.getItem(KEY);

  sessionStorage.removeItem(KEY);

  return redirect;
}