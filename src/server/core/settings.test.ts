import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

process.env.PGLITE_DIR = path.join(mkdtempSync(path.join(tmpdir(), "tgset-")), "db");
process.env.TELEGRAM_DAP_CHANNEL_ID = "@old_env_channel";

import { CmsError, type Actor } from "./actor";
import { dapChannelView, getDapChannelId, listLinkedAccounts, setDapChannelId } from "./settings";

const rejects = (p: Promise<unknown>, re: RegExp) => assert.rejects(p, (e) => e instanceof CmsError && re.test(e.message));
const exco: Actor = { email: "exco@smu.edu.sg", name: "Exco", role: "exco" };
const dap: Actor = { email: "dap@smu.edu.sg", name: "Dap", role: "dap_exco" };

describe("DAP channel setting", () => {
  it("falls back to the environment until saved in the CMS", async () => {
    assert.equal(await getDapChannelId(), "@old_env_channel");
    assert.deepEqual(await dapChannelView(exco), { channelId: "@old_env_channel", fromEnv: true });
    await setDapChannelId(exco, " -1001234567890 ");
    assert.equal(await getDapChannelId(), "-1001234567890");
    assert.deepEqual(await dapChannelView(exco), { channelId: "-1001234567890", fromEnv: false });
  });

  it("only exco admins change it, and only to a real channel reference", async () => {
    await rejects(setDapChannelId(dap, "@smubia_dap"), /exco admin/);
    await rejects(dapChannelView(dap), /exco admin/);
    await rejects(listLinkedAccounts(dap), /exco admin/);
    await rejects(setDapChannelId(exco, "smubia dap"), /@name or its numeric ID/);
    await setDapChannelId(exco, "@smubia_dap");
    assert.equal(await getDapChannelId(), "@smubia_dap");
  });
});
