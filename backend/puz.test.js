// Tests for the .puz text-encoding repair. Run with `npm test` (node --test).
import { test } from "node:test";
import assert from "node:assert/strict";
import { reDecodeUtf8 } from "./puz.js";

// A .puz v2.0 file stores UTF-8, but readpuz hands us those bytes decoded as
// Latin-1. reDecodeUtf8 undoes that. Build the mojibake the way it actually
// arrives: the UTF-8 bytes of a character, each read as one Latin-1 char.
const asLatin1 = (bytes) => Buffer.from(bytes).toString("latin1");

test("reDecodeUtf8: recovers smart quotes mangled by Latin-1 decoding", () => {
  // “ = U+201C = E2 80 9C,  ” = U+201D = E2 80 9D
  const mojibake = asLatin1([0xe2, 0x80, 0x9c]) + "Who?" + asLatin1([0xe2, 0x80, 0x9d]);
  assert.equal(reDecodeUtf8(mojibake), "“Who?”");
});

test("reDecodeUtf8: recovers an em dash and an accented letter", () => {
  assert.equal(reDecodeUtf8(asLatin1([0xe2, 0x80, 0x94])), "—"); // —
  assert.equal(reDecodeUtf8(asLatin1([0xc3, 0xa9])), "é");       // é
});

test("reDecodeUtf8: leaves plain ASCII untouched", () => {
  assert.equal(reDecodeUtf8("A bit of a tiff"), "A bit of a tiff");
  assert.equal(reDecodeUtf8("Don't look back"), "Don't look back");
});

test("reDecodeUtf8: keeps the original when bytes aren't valid UTF-8", () => {
  const lone = asLatin1([0xe2]); // a stray lead byte, not valid UTF-8
  assert.equal(reDecodeUtf8(lone), lone);
});
