import assert from "node:assert/strict";
import test from "node:test";

import {
  isSpotifyResource,
  isVideoResource,
  resolveLinkPresentation,
  resourceMediaKind,
} from "@/lib/resource-media";

function link(url: string) {
  return { type: "LINK" as const, mediaKind: resourceMediaKind(null), embed: resolveLinkPresentation(url) };
}

function file(mimeType: string) {
  return { type: "FILE" as const, mediaKind: resourceMediaKind(mimeType), embed: null };
}

test("YouTube links get a thumbnail", () => {
  assert.deepEqual(resolveLinkPresentation("https://youtu.be/OPf0YbXqDm0"), {
    provider: "youtube",
    src: "https://www.youtube-nocookie.com/embed/OPf0YbXqDm0",
    thumbnailUrl: "https://i.ytimg.com/vi/OPf0YbXqDm0/mqdefault.jpg",
  });
});

test("videos are YouTube links and uploaded video files", () => {
  assert.equal(isVideoResource(link("https://www.youtube.com/watch?v=OPf0YbXqDm0")), true);
  assert.equal(isVideoResource(file("video/mp4")), true);
  assert.equal(isVideoResource(file("audio/mpeg")), false);
  assert.equal(isVideoResource(link("https://open.spotify.com/track/32OlwWuMpZ6b0aN2RZOeMS")), false);
});

test("Spotify links are the choreography's music", () => {
  assert.equal(isSpotifyResource(link("https://open.spotify.com/track/32OlwWuMpZ6b0aN2RZOeMS")), true);
  assert.equal(isSpotifyResource(link("https://example.com/song")), false);
});
