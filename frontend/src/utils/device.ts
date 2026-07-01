// utils/device.ts

export function isMobileOrTablet() {
  const ua = navigator.userAgent;
  const nav = navigator as Navigator & {
    userAgentData?: { mobile?: boolean };
  };

  // Chrome's modern mobile detection
  if (nav.userAgentData?.mobile === true) {
    return true;
  }

  // Traditional UA detection
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(
    ua
  );
}