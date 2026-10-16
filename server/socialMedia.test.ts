import { describe, expect, it } from "vitest";
import { isValidSocialMediaUrl, normalizePublicWebsiteUrl, normalizeSocialMediaLinks, normalizeSocialMediaUrl } from "../shared/socialMedia";

describe("social media contract", () => {
  it("normalizes supported HTTPS profile URLs and removes fragments", () => {
    expect(normalizeSocialMediaUrl("instagram", " https://www.instagram.com/idefazei/#sobre ")).toBe("https://www.instagram.com/idefazei/");
    expect(normalizeSocialMediaUrl("youtube", "https://youtu.be/abc123")).toBe("https://youtu.be/abc123");
  });

  it("rejects unsafe schemes, credentials, ports and unrelated hosts", () => {
    expect(isValidSocialMediaUrl("instagram", "javascript:alert(1)")).toBe(false);
    expect(isValidSocialMediaUrl("facebook", "https://evil.example/igreja")).toBe(false);
    expect(isValidSocialMediaUrl("youtube", "https://user:pass@youtube.com/channel")).toBe(false);
    expect(isValidSocialMediaUrl("tiktok", "https://tiktok.com:8443/@igreja")).toBe(false);
  });

  it("accepts a public HTTP(S) website and rejects credentials or unsafe schemes", () => {
    expect(normalizePublicWebsiteUrl("https://igreja.example.com/#contato")).toBe("https://igreja.example.com/");
    expect(normalizePublicWebsiteUrl("http://igreja.example.com")).toBe("http://igreja.example.com/");
    expect(normalizePublicWebsiteUrl("javascript:alert(1)")).toBeNull();
    expect(normalizePublicWebsiteUrl("https://user:pass@igreja.example.com")).toBeNull();
  });

  it("keeps only supported valid links when sanitizing persisted JSON", () => {
    expect(normalizeSocialMediaLinks({
      instagram: "https://instagram.com/igreja",
      facebook: "javascript:alert(1)",
      youtube: "https://www.youtube.com/@igreja#videos",
      tiktok: "",
      unknown: "https://evil.example",
    })).toEqual({
      instagram: "https://instagram.com/igreja",
      youtube: "https://www.youtube.com/@igreja",
    });
  });
});
