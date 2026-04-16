const urlPattern = /https?:\/\/\S+/;

type EmailLinkCapture = {
  getVerificationUrl: () => string;
  getPasswordResetUrl: () => string;
  restore: () => void;
};

function extractUrl(values: unknown[]) {
  for (const value of values) {
    const match = String(value).match(urlPattern);
    if (match) {
      return match[0];
    }
  }

  return null;
}

export function installEmailLinkCapture(): EmailLinkCapture {
  const originalLog = console.log;
  let verificationUrl: string | null = null;
  let passwordResetUrl: string | null = null;

  console.log = (...values: unknown[]) => {
    const line = values.map(String).join(" ");

    if (line.includes("Verification Email:")) {
      verificationUrl = extractUrl(values);
    }

    if (line.includes("Password Reset Email:")) {
      passwordResetUrl = extractUrl(values);
    }

    originalLog(...values);
  };

  return {
    getVerificationUrl() {
      if (!verificationUrl) {
        throw new Error("Verification Email: URL was not captured.");
      }

      return verificationUrl;
    },
    getPasswordResetUrl() {
      if (!passwordResetUrl) {
        throw new Error("Password Reset Email: URL was not captured.");
      }

      return passwordResetUrl;
    },
    restore() {
      console.log = originalLog;
    }
  };
}
