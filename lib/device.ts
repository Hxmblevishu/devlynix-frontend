export interface ParsedDevice {
  title: string;
  platform: string;
  deviceType: "desktop" | "mobile" | "tablet" | "terminal";
  icon: string;
  badge: string;
}

/**
 * Parses any raw or formatted device info string into human-friendly device telemetry.
 */
export function parseDevice(raw?: string | null): ParsedDevice {
  if (!raw || raw.trim() === "" || raw === "Unknown Device") {
    return {
      title: "Web Browser",
      platform: "Desktop PC",
      deviceType: "desktop",
      icon: "💻",
      badge: "DESKTOP",
    };
  }

  const text = raw.trim();

  // 1. If backend already formatted as "Browser on OS" or "Client (OS)"
  if (text.includes(" on ")) {
    const [browserPart, ...osParts] = text.split(" on ");
    const osPart = osParts.join(" on ").trim();
    const isMobile =
      /iphone|android|mobile|ipad|tablet/i.test(osPart) ||
      /ios/i.test(browserPart);
    const isTablet = /ipad|tablet/i.test(osPart);

    return {
      title: browserPart.trim(),
      platform: osPart,
      deviceType: isTablet ? "tablet" : isMobile ? "mobile" : "desktop",
      icon: isTablet ? "📟" : isMobile ? "📱" : "💻",
      badge: isTablet ? "TABLET" : isMobile ? "MOBILE" : "DESKTOP",
    };
  }

  if (text.includes("(") && text.includes(")")) {
    const match = text.match(/^(.*?)\s*\((.*?)\)$/);
    if (match) {
      const isCli = /curl|postman|insomnia|cli|terminal/i.test(match[1]);
      return {
        title: match[1].trim(),
        platform: match[2].trim(),
        deviceType: isCli ? "terminal" : "desktop",
        icon: isCli ? "⚡" : "💻",
        badge: isCli ? "API / CLI" : "DESKTOP",
      };
    }
  }

  // 2. Raw User-Agent string fallback parser
  let title = "Web Browser";
  let platform = "Desktop PC";
  let deviceType: "desktop" | "mobile" | "tablet" | "terminal" = "desktop";
  let icon = "💻";
  let badge = "DESKTOP";

  // Detect Platform / OS
  if (/iphone/i.test(text)) {
    platform = "Apple iPhone";
    deviceType = "mobile";
    icon = "📱";
    badge = "MOBILE";
  } else if (/ipad/i.test(text)) {
    platform = "Apple iPad";
    deviceType = "tablet";
    icon = "📟";
    badge = "TABLET";
  } else if (/macintosh|mac os x/i.test(text)) {
    platform = "Apple Mac (macOS)";
    deviceType = "desktop";
    icon = "💻";
    badge = "DESKTOP";
  } else if (/windows nt 10\.0|windows nt 11\.0/i.test(text)) {
    platform = "Windows 11 / 10 PC";
    deviceType = "desktop";
    icon = "💻";
    badge = "DESKTOP";
  } else if (/windows/i.test(text)) {
    platform = "Windows PC";
    deviceType = "desktop";
    icon = "💻";
    badge = "DESKTOP";
  } else if (/android/i.test(text)) {
    if (/tablet/i.test(text)) {
      platform = "Android Tablet";
      deviceType = "tablet";
      icon = "📟";
      badge = "TABLET";
    } else if (/samsung|sm-/i.test(text)) {
      platform = "Samsung Galaxy (Android)";
      deviceType = "mobile";
      icon = "📱";
      badge = "MOBILE";
    } else if (/pixel/i.test(text)) {
      platform = "Google Pixel (Android)";
      deviceType = "mobile";
      icon = "📱";
      badge = "MOBILE";
    } else {
      platform = "Android Phone";
      deviceType = "mobile";
      icon = "📱";
      badge = "MOBILE";
    }
  } else if (/cros/i.test(text)) {
    platform = "Chromebook (ChromeOS)";
    deviceType = "desktop";
    icon = "💻";
    badge = "DESKTOP";
  } else if (/ubuntu|debian|fedora|linux/i.test(text)) {
    platform = "Linux PC";
    deviceType = "desktop";
    icon = "💻";
    badge = "DESKTOP";
  }

  // Detect Browser
  if (/postman/i.test(text)) {
    title = "Postman API Client";
    deviceType = "terminal";
    icon = "⚡";
    badge = "API";
  } else if (/curl/i.test(text)) {
    title = "cURL Developer Tool";
    deviceType = "terminal";
    icon = "⚡";
    badge = "CLI";
  } else if (/arc\//i.test(text)) {
    title = "Arc Browser";
  } else if (/brave\//i.test(text)) {
    title = "Brave Browser";
  } else if (/opr\/|opera/i.test(text)) {
    title = "Opera Browser";
  } else if (/edg\/|edge\/|edgios/i.test(text)) {
    title = "Microsoft Edge";
  } else if (/samsungbrowser/i.test(text)) {
    title = "Samsung Internet";
  } else if (/vivaldi/i.test(text)) {
    title = "Vivaldi Browser";
  } else if (/duckduckgo/i.test(text)) {
    title = "DuckDuckGo Browser";
  } else if (/firefox|fxios/i.test(text)) {
    title = "Mozilla Firefox";
  } else if (/crios/i.test(text)) {
    title = "Google Chrome (iOS)";
  } else if (/chrome\//i.test(text)) {
    title = "Google Chrome";
  } else if (/safari\//i.test(text)) {
    title = "Apple Safari";
  }

  return { title, platform, deviceType, icon, badge };
}
