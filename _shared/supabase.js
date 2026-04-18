/*
 * Electro Union — Supabase Helpers (shared)
 *
 * Inkludera efter embed.js i varje modul som pratar med Supabase
 * (gate, guestbook, drawing-submit):
 *   <script src="../_shared/supabase.js"></script>
 *
 * Exponerar `window.EU_SUPABASE` med:
 *   - fetch(path, opts)           → JSON-parsed response
 *   - rpc(fn)                     → POST till /rpc/<fn>, returnerar Promise<any>
 *   - upload(bucket, fileName, blob)  → Promise<{Key, ...}>
 *   - publicUrl(bucket, path)     → string
 *
 * Konfiguration:
 *   - URL: qqaiqevsygqwlfnvnhiu.supabase.co
 *   - Publishable key (safe att exponera i frontend — RLS styr åtkomst)
 *   - Tabeller: approvals, gallery
 *   - Storage bucket: gallery-images
 *   - Schema: se supabase-setup.sql i golden/
 */

(function () {
  var SB_URL = 'https://qqaiqevsygqwlfnvnhiu.supabase.co';
  var SB_KEY = 'sb_publishable_LQBAlgmAKbdfQBCh5xHuNw_6gYMvHcz';
  var SB_HEADERS = {
    apikey: SB_KEY,
    Authorization: 'Bearer ' + SB_KEY,
    'Content-Type': 'application/json'
  };

  function sbFetch(path, opts) {
    opts = opts || {};
    var url = SB_URL + path;
    return fetch(url, {
      method: opts.method || 'GET',
      headers: Object.assign({}, SB_HEADERS, opts.headers || {}),
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (r) {
      return r.json();
    });
  }

  function sbRpc(fn) {
    return sbFetch('/rest/v1/rpc/' + fn, { method: 'POST', body: {} });
  }

  function sbUpload(bucket, fileName, blob) {
    return fetch(SB_URL + '/storage/v1/object/' + bucket + '/' + fileName, {
      method: 'POST',
      headers: {
        apikey: SB_KEY,
        Authorization: 'Bearer ' + SB_KEY,
        'Content-Type': blob.type,
        'x-upsert': 'true'
      },
      body: blob
    }).then(function (r) {
      return r.json();
    });
  }

  function sbPublicUrl(bucket, path) {
    return SB_URL + '/storage/v1/object/public/' + bucket + '/' + path;
  }

  window.EU_SUPABASE = {
    url: SB_URL,
    fetch: sbFetch,
    rpc: sbRpc,
    upload: sbUpload,
    publicUrl: sbPublicUrl
  };
})();
