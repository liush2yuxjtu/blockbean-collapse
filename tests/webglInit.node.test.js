import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WEBGL_PROFILES,
  probeWebGLContexts,
  formatRuntimeFallbackReason,
  createWebGLRendererWithFallback
} from '../modules/webglInit.js';

test('WEBGL_PROFILES order is hi → default → noaa → bare', () => {
  assert.deepEqual(WEBGL_PROFILES.map(p => p.id), ['hi', 'default', 'noaa', 'bare']);
  assert.equal(WEBGL_PROFILES[0].opts.powerPreference, 'high-performance');
  assert.equal(WEBGL_PROFILES[0].opts.antialias, true);
  assert.equal(WEBGL_PROFILES[2].opts.antialias, false);
  assert.equal(WEBGL_PROFILES[3].opts.antialias, false);
  assert.equal('powerPreference' in WEBGL_PROFILES[3].opts, false);
});

test('formatRuntimeFallbackReason includes probe flags and truncated err', () => {
  const reason = formatRuntimeFallbackReason(new Error('boom boom boom'), { webgl2: false, webgl: true }, 40);
  assert.match(reason, /^webgl2=0,webgl=1,err=/);
  assert.equal(reason.length <= 40, true);
  assert.match(reason, /boom/);
});

test('probeWebGLContexts returns falsees without document', () => {
  assert.deepEqual(probeWebGLContexts(null), { webgl2: false, webgl: false });
});

test('probeWebGLContexts reads separate canvases', () => {
  const calls = [];
  const fakeDoc = {
    createElement(tag) {
      assert.equal(tag, 'canvas');
      return {
        getContext(type) {
          calls.push(type);
          if (type === 'webgl2') return {};
          if (type === 'webgl') return null;
          return null;
        }
      };
    }
  };
  assert.deepEqual(probeWebGLContexts(fakeDoc), { webgl2: true, webgl: false });
  assert.ok(calls.includes('webgl2'));
});

test('createWebGLRendererWithFallback uses first succeeding profile', () => {
  const events = [];
  const tried = [];
  class FakeRenderer {
    constructor(opts) {
      tried.push(opts);
      if (opts.powerPreference === 'high-performance') throw new Error('hi fail');
      this.opts = opts;
    }
  }
  const out = createWebGLRendererWithFallback(FakeRenderer, (name, data) => events.push({ name, data }));
  assert.equal(out.profile, 'default');
  assert.ok(out.renderer);
  assert.equal(out.error, null);
  assert.equal(tried.length, 2);
  assert.deepEqual(events, [{ name: 'webgl_profile', data: { profile: 'default' } }]);
});

test('createWebGLRendererWithFallback returns last error when all fail', () => {
  class AlwaysFail {
    constructor() { throw new Error('no gpu'); }
  }
  const out = createWebGLRendererWithFallback(AlwaysFail, () => {});
  assert.equal(out.renderer, null);
  assert.equal(out.profile, null);
  assert.match(String(out.error?.message || ''), /no gpu/);
});
