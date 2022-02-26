import { parsePoll } from "./parse.ts";
import {
  assertEquals,
  assertIsError,
  fail,
} from "https://deno.land/std@0.127.0/testing/asserts.ts";

Deno.test("basic", () => {
  assertEquals(parsePoll("/poll test\nA\nB"), {
    is_multi: false,
    title: "test",
    options: ["A", "B"],
  });
});

Deno.test("multi", () => {
  assertEquals(parsePoll("/mpoll test\nA\nB"), {
    is_multi: true,
    title: "test",
    options: ["A", "B"],
  });
});

Deno.test("too few", () => {
  try {
    parsePoll("/poll test\nA")
    fail("unreachable")
  } catch (e) {
    assertIsError(e, Error, "至少提供2个选项")
  }
});

Deno.test("too many", () => {
  try {
    parsePoll("/poll test\nA\nA\nA\nA\nA\nA\nA\nA\nA\nA\nA\nA\nA\nA\nA\nA")
    fail("unreachable")
  } catch (e) {
    assertIsError(e, Error, "至多提供10个选项")
  }
});

Deno.test("space", () => {
  assertEquals(parsePoll("/poll test a b c\nA\nB"), {
    is_multi: false,
    title: "test a b c",
    options: ["A", "B"],
  });
})
