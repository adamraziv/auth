export class CookieJar {
  private readonly cookies = new Map<string, string>();

  store(response: Response) {
    const setCookie = response.headers.get("set-cookie");
    if (!setCookie) {
      return;
    }

    for (const cookie of splitSetCookie(setCookie)) {
      const [nameValue] = cookie.split(";");
      const separatorIndex = nameValue.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const name = nameValue.slice(0, separatorIndex).trim();
      const value = nameValue.slice(separatorIndex + 1).trim();

      if (name) {
        this.cookies.set(name, value);
      }
    }
  }

  header() {
    return [...this.cookies.entries()]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  headers(extra?: HeadersInit) {
    const headers = new Headers(extra);
    const cookieHeader = this.header();

    if (cookieHeader) {
      headers.set("Cookie", cookieHeader);
    }

    return headers;
  }
}

function splitSetCookie(value: string) {
  return value.split(/,(?=\s*[^;,=\s]+=[^;,]+)/).map((cookie) => cookie.trim());
}
