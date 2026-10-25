import assert from "node:assert/strict";
import { test, afterEach } from "node:test";
import sharp from "sharp";
import { preparePhoto, renderMeme, memeOverlay } from "../lib/meme.ts";
import { generatePhotoCaption, PhotoCaptionError } from "../lib/gemini-photo.ts";
import { parseGalleryCursor } from "../lib/gallery-cursor.ts";

const originalFetch = globalThis.fetch;
const originalKey = process.env.GEMINI_API_KEY;
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalKey;
});

test("photo normalization respects EXIF orientation, bounds output, and strips metadata", async () => {
  const source = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: "#eac856" } })
    .jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const { data, info } = await preparePhoto(source);
  assert.equal(info.width, 800);
  assert.equal(info.height, 1600);
  const metadata = await sharp(data).metadata();
  assert.equal(metadata.format, "jpeg");
  assert.equal(metadata.exif, undefined);
});

test("invalid images, tiny images, and unsupported formats are rejected before AI generation", async () => {
  await assert.rejects(() => preparePhoto(Buffer.from("pretend-photo")));
  const tiny = await sharp({ create: { width: 64, height: 64, channels: 3, background: "white" } }).png().toBuffer();
  await assert.rejects(() => preparePhoto(tiny), /128/);
  await assert.rejects(() => preparePhoto(Buffer.from('<svg width="300" height="300"></svg>')));
  const panorama = await sharp({ create: { width: 2000, height: 128, channels: 3, background: "white" } }).jpeg().toBuffer();
  await assert.rejects(() => preparePhoto(panorama), /aspect ratio/);
});

test("a meme is an actual captioned JPEG with readable text on landscape and portrait photos", async () => {
  for (const [width, height] of [[800, 600], [300, 1200], [1200, 300]]) {
    const source = await sharp({ create: { width, height, channels: 3, background: "#eac856" } }).jpeg().toBuffer();
    const result = await renderMeme(source, "Me pretending this deadline was part of the plan", width, height);
    const metadata = await sharp(result).metadata();
    assert.equal(metadata.format, "jpeg");
    assert.equal(metadata.width, width);
    assert.equal(metadata.height, height);
    const { data, info } = await sharp(result).raw().toBuffer({ resolveWithObject: true });
    let dark = 0;
    let white = 0;
    for (let y = Math.floor(height * 0.55); y < height; y++) {
      for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * info.channels;
        if (data[offset] < 60 && data[offset + 1] < 60 && data[offset + 2] < 60) dark++;
        if (data[offset] > 235 && data[offset + 1] > 235 && data[offset + 2] > 235) white++;
      }
    }
    assert.ok(dark > 100, "The image has the black meme outline");
    assert.ok(white > 100, "The image has white caption text");
  }
});

test("captions cannot inject markup into the image overlay", () => {
  const overlay = memeOverlay('<script>alert("no")</script> & friends', 800, 600).toString();
  assert.ok(!overlay.includes("<SCRIPT>"));
  assert.ok(overlay.includes("&lt;SCRIPT&gt;"));
  assert.ok(overlay.includes("&amp;"));
});

test("gallery cursors preserve microsecond ordering and reject invalid or injected filters", () => {
  const cursor = { createdAt: "2026-10-25T22:00:00.123456+00:00", id: "12345678-1234-4321-8234-123456789abc" };
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  assert.deepEqual(parseGalleryCursor(encode(cursor)), cursor);
  for (const value of [null, {}, { ...cursor, id: "bad),created_by.neq.null" }, { ...cursor, createdAt: "yesterday" }]) {
    assert.throws(() => parseGalleryCursor(encode(value)));
  }
  assert.throws(() => parseGalleryCursor("x".repeat(300)));
});

test("photo caption requests send the actual image with the API key only in the server header", async () => {
  process.env.GEMINI_API_KEY = "test-key";
  globalThis.fetch = async (url, options) => {
    assert.ok(!url.includes("test-key"));
    assert.equal(options.headers["x-goog-api-key"], "test-key");
    const body = JSON.parse(options.body);
    assert.equal(body.contents[0].parts[0].inlineData.data, Buffer.from("image-bytes").toString("base64"));
    assert.equal(body.contents[0].parts[0].inlineData.mimeType, "image/jpeg");
    assert.ok(body.contents[0].parts[1].text.includes("lecture"));
    return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [
      { text: "Private reasoning", thought: true }, { text: '"Me understanding every third word"' },
    ] } }] });
  };
  assert.equal(await generatePhotoCaption(Buffer.from("image-bytes"), "lecture"), "Me understanding every third word");
});

test("missing configuration, blocked responses, provider errors, and empty captions fail clearly", async () => {
  delete process.env.GEMINI_API_KEY;
  await assert.rejects(() => generatePhotoCaption(Buffer.from("test"), ""), (error) => error instanceof PhotoCaptionError && error.status === 503);
  process.env.GEMINI_API_KEY = "test-key";
  for (const response of [
    Response.json({ candidates: [{ finishReason: "SAFETY" }] }),
    Response.json({ candidates: [] }),
    Response.json({ candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [{ text: "An unfinished" }] } }] }),
    new Response("not JSON"),
    new Response("", { status: 429 }),
  ]) {
    globalThis.fetch = async () => response;
    await assert.rejects(() => generatePhotoCaption(Buffer.from("test"), ""), PhotoCaptionError);
  }
});
