import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb } from "./supabase-db";

let t: Awaited<ReturnType<typeof createTestDb>>;
let seller: string;
let buyer: string;
let stranger: string;
let ids: { toyota: number; lc: number; yaris: number; framljos: number; ljos: number };

const titles = (rows: { title: string }[]) => rows.map((r) => r.title);

async function publish(title: string, price: number | null, condition: string, region: string, fit: [number, number | null] | null) {
  await t.as(seller);
  const [l] = await t.q<{ id: string }>(
    `insert into listings (seller_id, title, category_id, price_isk, condition, region)
     values ($1, $2, $3, $4, $5, $6) returning id`,
    [seller, title, ids.framljos, price, condition, region],
  );
  if (fit) {
    await t.q(`insert into listing_fitments (listing_id, make_id, model_id) values ($1, $2, $3)`, [l.id, ...fit]);
  }
  await t.q(`update listings set status = 'active' where id = $1`, [l.id]);
  return l.id;
}

beforeAll(async () => {
  t = await createTestDb();
  seller = await t.createUser("seljandi@test.is");
  buyer = await t.createUser("kaupandi@test.is");
  stranger = await t.createUser("annar@test.is");
  const one = async (sql: string) => (await t.q<{ id: number }>(sql))[0].id;
  ids = {
    toyota: await one(`select id from makes where name = 'Toyota'`),
    lc: await one(`select id from models where name = 'Land Cruiser 120'`),
    yaris: await one(`select id from models where name = 'Yaris'`),
    framljos: await one(`select id from categories where slug = 'framljos'`),
    ljos: await one(`select id from categories where slug = 'ljos'`),
  };
}, 60_000);

describe("seed og prófílar", () => {
  it("hleður tegundum, gerðum og flokkum", async () => {
    const [c] = await t.q<{ makes: number; models: number; cats: number }>(
      `select (select count(*)::int from makes) makes, (select count(*)::int from models) models,
              (select count(*)::int from categories) cats`,
    );
    expect(c.makes).toBeGreaterThan(25);
    expect(c.models).toBeGreaterThan(200);
    expect(c.cats).toBeGreaterThan(30);
  });

  it("býr til prófíl sjálfkrafa, líka fyrir nafnlausa notendur", async () => {
    const anon = await t.createUser(null);
    const rows = await t.q<{ id: string; display_name: string }>(`select id, display_name from profiles`);
    expect(rows.find((r) => r.id === seller)?.display_name).toBe("seljandi");
    expect(rows.find((r) => r.id === anon)?.display_name).toMatch(/^Notandi [0-9a-f]{4}$/);
  });
});

describe("óska eftir", () => {
  it("sendir tilkynningu þegar auglýsing sem passar er birt", async () => {
    await t.as(buyer);
    await t.q(
      `insert into wanted_requests (user_id, query, category_id, make_id, model_id, year, max_price_isk)
       values ($1, 'framljós', $2, $3, $4, 2005, 50000)`,
      [buyer, ids.ljos, ids.toyota, ids.lc],
    );
    // Passar ekki: annar bíll
    await t.q(`insert into wanted_requests (user_id, query, make_id, model_id) values ($1, 'framljós', $2, $3)`, [
      buyer,
      ids.toyota,
      ids.yaris,
    ]);

    await t.as(seller);
    const [l] = await t.q<{ id: string }>(
      `insert into listings (seller_id, title, category_id, price_isk, condition, region)
       values ($1, 'Framljós vinstra megin', $2, 25000, 'gott', 'hofudborgarsvaedid') returning id`,
      [seller, ids.framljos],
    );
    await t.q(`insert into listing_fitments (listing_id, make_id, model_id, year_from, year_to) values ($1, $2, $3, 2003, 2009)`, [
      l.id,
      ids.toyota,
      ids.lc,
    ]);
    await t.q(`update listings set status = 'active' where id = $1`, [l.id]);

    await t.as(buyer);
    expect(await t.q(`select * from notifications`)).toHaveLength(1);
  });
});

describe("leit", () => {
  beforeAll(async () => {
    await publish("Afturljós Yaris", 8000, "notad", "nordurland_eystra", [ids.toyota, ids.yaris]);
    await publish("Framljós Toyota allar gerðir", 15000, "nytt", "hofudborgarsvaedid", [ids.toyota, null]);
    await publish("Ljós tilboð", null, "gott", "sudurland", null);
    await t.as(null);
  });

  it("síar eftir bíl og árgerð", async () => {
    const fits = await t.q<{ title: string }>(
      `select title from search_listings(p_make => $1, p_model => $2, p_year => 2010, p_sort => 'price_asc')`,
      [ids.toyota, ids.yaris],
    );
    expect(titles(fits)).toEqual(["Afturljós Yaris", "Framljós Toyota allar gerðir"]);
    const tooNew = await t.q<{ title: string }>(`select title from search_listings(p_make => $1, p_model => $2, p_year => 2015)`, [
      ids.toyota,
      ids.lc,
    ]);
    expect(titles(tooNew)).toEqual(["Framljós Toyota allar gerðir"]);
  });

  it("síar eftir verði, ástandi og landshluta", async () => {
    expect(
      titles(await t.q(`select title from search_listings(p_min_price => 10000, p_max_price => 30000, p_sort => 'price_asc')`)),
    ).toEqual(["Framljós Toyota allar gerðir", "Framljós vinstra megin"]);
    expect(
      titles(
        await t.q(`select title from search_listings(p_conditions => array['nytt','notad']::item_condition[], p_sort => 'price_asc')`),
      ),
    ).toEqual(["Afturljós Yaris", "Framljós Toyota allar gerðir"]);
    expect(titles(await t.q(`select title from search_listings(p_region => 'sudurland')`))).toEqual(["Ljós tilboð"]);
  });

  it("raðar og skiptir í síður, „Tilboð“ síðast", async () => {
    const all = ["Framljós vinstra megin", "Framljós Toyota allar gerðir", "Afturljós Yaris", "Ljós tilboð"];
    expect(titles(await t.q(`select title from search_listings(p_sort => 'price_desc')`))).toEqual(all);
    expect(titles(await t.q(`select title from search_listings(p_sort => 'price_desc', p_limit => 2, p_offset => 2)`))).toEqual(
      all.slice(2),
    );
  });

  it("samheiti, hlutar orða og innsláttarvillur", async () => {
    // „aðalljós“ er samheiti framljóss
    expect(titles(await t.q(`select title from search_listings(q => 'aðalljós', p_sort => 'price_asc')`))).toEqual([
      "Framljós Toyota allar gerðir",
      "Framljós vinstra megin",
    ]);
    // „ljos“ (án kommu) finnur líka afturljós sem hluta orðs
    expect(await t.q(`select title from search_listings(q => 'ljos')`)).toHaveLength(4);
    // Innsláttarvilla
    expect(titles(await t.q(`select title from search_listings(q => 'afturljos yarsi')`))).toEqual(["Afturljós Yaris"]);
    expect(await t.q(`select title from search_listings(q => 'dráttarkrókur')`)).toHaveLength(0);
  });

  it("uppástungur: bílar, flokkar og auglýsingar", async () => {
    const s = await t.q<{ kind: string; label: string }>(`select kind, label from search_suggestions('land cr')`);
    expect(s.filter((r) => r.kind === "car").map((r) => r.label)).toContain("Toyota Land Cruiser 120");
    const l = await t.q<{ kind: string; label: string }>(`select kind, label from search_suggestions('framlj')`);
    expect(l.some((r) => r.kind === "category" && r.label === "Framljós")).toBe(true);
    expect(l.some((r) => r.kind === "listing" && r.label === "Framljós vinstra megin")).toBe(true);
  });

  it("fjarlægð: röðun og hámarksfjarlægð frá póstnúmeri", async () => {
    // Auglýsingar: höfuðborgarsvæði (×2), Norðurland eystra, Suðurland. Frá Akureyri (600):
    const near = await t.q<{ title: string; region: string }>(
      `select title, region from search_listings(p_near => '600', p_sort => 'distance')`,
    );
    expect(near[0].region).toBe("nordurland_eystra");
    const within = await t.q(`select title from search_listings(p_near => '600', p_max_km => 100)`);
    expect(titles(within as { title: string }[])).toEqual(["Afturljós Yaris"]);
  });

  it("textaleit með og án kommu og yfirflokkur", async () => {
    expect(titles(await t.q(`select title from search_listings(q => 'afturljós yaris')`))).toEqual(["Afturljós Yaris"]);
    expect(await t.q(`select title from search_listings(q => 'framljos')`)).not.toHaveLength(0);
    expect(await t.q(`select title from search_listings(p_category => $1)`, [ids.ljos])).toHaveLength(4);
  });
});

describe("spjall og aðgangsreglur", () => {
  let conv: string;

  it("kaupandi hefur samtal og seljandi fær ólesið", async () => {
    await t.as(null);
    const [l] = await t.q<{ id: string }>(`select id from search_listings(q => 'Afturljós')`);
    await t.as(buyer);
    [{ start_conversation: conv }] = await t.q<{ start_conversation: string }>(`select start_conversation($1)`, [l.id]);
    await t.q(`insert into messages (conversation_id, sender_id, body) values ($1, $2, 'Er þetta enn til?')`, [conv, buyer]);

    await t.as(seller);
    const [c] = await t.q<{ conversations: number }>(`select * from my_unread_counts()`);
    expect(c.conversations).toBe(1);
    const [preview] = await t.q<{ last_message_body: string }>(`select last_message_body from conversations where id = $1`, [conv]);
    expect(preview.last_message_body).toBe("Er þetta enn til?");

    await t.q(`select mark_conversation_read($1)`, [conv]);
    const [after] = await t.q<{ conversations: number }>(`select * from my_unread_counts()`);
    expect(after.conversations).toBe(0);
  });

  it("þriðji aðili sér hvorki né sendir skilaboð", async () => {
    await t.as(stranger);
    expect(await t.q(`select * from messages`)).toHaveLength(0);
    await expect(
      t.q(`insert into messages (conversation_id, sender_id, body) values ($1, $2, 'hæ')`, [conv, stranger]),
    ).rejects.toThrow();
  });

  it("nafnlaus sér auglýsingar en ekki síma", async () => {
    await t.as(null);
    expect(await t.q(`select * from search_listings()`)).toHaveLength(4);
    expect(await t.q(`select * from profile_contacts`)).toHaveLength(0);
  });

  it("lokun: sá sem lokað er á getur ekki sent né hafið samtal og hverfur úr leit", async () => {
    await t.as(seller);
    await t.q(`insert into blocks (blocker_id, blocked_id) values ($1, $2)`, [seller, buyer]);

    await t.as(buyer);
    await expect(
      t.q(`insert into messages (conversation_id, sender_id, body) values ($1, $2, 'halló?')`, [conv, buyer]),
    ).rejects.toThrow();
    const [l] = await t.q<{ id: string }>(`select id from listings where title = 'Ljós tilboð'`);
    await expect(t.q(`select start_conversation($1)`, [l.id])).rejects.toThrow(/blocked/);
    // Kaupandinn sér ekki lokanir seljandans
    expect(await t.q(`select * from blocks`)).toHaveLength(0);

    // Seljandi sér ekki auglýsingar þess sem hann lokaði á (kaupandi á engar; prófum öfugt)
    await t.as(buyer);
    await t.q(`insert into blocks (blocker_id, blocked_id) values ($1, $2)`, [buyer, seller]);
    expect(await t.q(`select * from search_listings()`)).toHaveLength(0);
    await t.q(`delete from blocks where blocker_id = $1`, [buyer]);
    expect(await t.q(`select * from search_listings()`)).toHaveLength(4);

    await t.as(seller);
    await t.q(`delete from blocks where blocker_id = $1`, [seller]);
    await t.as(buyer);
    await t.q(`insert into messages (conversation_id, sender_id, body) values ($1, $2, 'opið aftur')`, [conv, buyer]);
  });

  it("tilkynningar: ekki eigin auglýsing, og þrjár fela auglýsingu", async () => {
    const [l] = await t.q<{ id: string }>(`select id from listings where title = 'Ljós tilboð'`);
    await t.as(seller);
    await expect(t.q(`insert into reports (listing_id, reporter_id, reason) values ($1, $2, 'svik')`, [l.id, seller])).rejects.toThrow();

    for (const u of [buyer, stranger, await t.createUser("thridji@test.is")]) {
      await t.as(u);
      await t.q(`insert into reports (listing_id, reporter_id, reason) values ($1, $2, 'svik')`, [l.id, u]);
    }
    await t.asAdmin();
    const [after] = await t.q<{ status: string }>(`select status from listings where id = $1`, [l.id]);
    expect(after.status).toBe("removed");
    await t.q(`update listings set status = 'active' where id = $1`, [l.id]);
    await t.q(`delete from reports where listing_id = $1`, [l.id]);
  });

  it("uppáhalds eru einkamál hvers notanda", async () => {
    const [l] = await t.q<{ id: string }>(`select id from listings where title = 'Afturljós Yaris'`);
    await t.as(buyer);
    await t.q(`insert into favorites (user_id, listing_id) values ($1, $2)`, [buyer, l.id]);
    expect(await t.q(`select * from favorites`)).toHaveLength(1);
    await t.as(stranger);
    expect(await t.q(`select * from favorites`)).toHaveLength(0);
    await expect(t.q(`insert into favorites (user_id, listing_id) values ($1, $2)`, [buyer, l.id])).rejects.toThrow();
  });

  it("einkvæm nöfn: óháð hástöfum og bilum, ný nöfn fá númer, og laust nafn er hægt að athuga", async () => {
    // Nafn sem er tekið, með öðrum hástöfum og aukabilum, er hafnað
    await t.as(buyer);
    await expect(t.q(`update profiles set display_name = '  SELJANDI ' where id = $1`, [buyer])).rejects.toThrow(/name_key|unique/i);
    expect((await t.q<{ ok: boolean }>(`select display_name_available('Seljandi') ok`))[0].ok).toBe(false);
    expect((await t.q<{ ok: boolean }>(`select display_name_available('Glænýtt nafn') ok`))[0].ok).toBe(true);
    // Eigið nafn telst laust (að vista prófílinn óbreyttan virkar)
    expect((await t.q<{ ok: boolean }>(`select display_name_available('Kaupandi') ok`))[0].ok).toBe(true);
    await t.q(`update profiles set display_name = 'kaupandi' where id = $1`, [buyer]);

    // Nýr notandi með sama netfangsforskeyti fær laust nafn
    const twin = await t.createUser("seljandi@annad.is");
    await t.asAdmin();
    const [{ display_name }] = await t.q<{ display_name: string }>(`select display_name from profiles where id = $1`, [twin]);
    expect(display_name).toBe("seljandi 2");
    await t.q(`delete from auth.users where id = $1`, [twin]);
  });

  it("verð lækkað: fyrra verð munað, helst við aðra lækkun og hverfur við hækkun", async () => {
    const id = await publish("Verðmerkisprufa", 45000, "gott", "hofudborgarsvaedid", null);
    const read = async () => {
      const [r] = await t.q<{ price_isk: number; previous_price_isk: number | null; price_dropped_at: string | null }>(
        `select price_isk, previous_price_isk, price_dropped_at from listings where id = $1`,
        [id],
      );
      return r;
    };
    await t.as(seller);
    await t.q(`update listings set price_isk = 35000 where id = $1`, [id]);
    expect(await read()).toMatchObject({ price_isk: 35000, previous_price_isk: 45000 });
    expect((await read()).price_dropped_at).not.toBeNull();

    await t.q(`update listings set price_isk = 30000 where id = $1`, [id]); // önnur lækkun: upprunalegt verð helst
    expect(await read()).toMatchObject({ price_isk: 30000, previous_price_isk: 45000 });

    await t.q(`update listings set title = 'Verðmerkisprufa 2' where id = $1`, [id]); // annað en verð: óbreytt
    expect(await read()).toMatchObject({ previous_price_isk: 45000 });

    await t.q(`update listings set price_isk = 50000 where id = $1`, [id]); // hækkað yfir fyrra verð
    expect(await read()).toMatchObject({ price_isk: 50000, previous_price_isk: null, price_dropped_at: null });

    await t.asAdmin();
    await t.q(`delete from listings where id = $1`, [id]);
  });

  it("tölfræði: skoðanir annarra teljast, seljandinn sér bara sínar tölur", async () => {
    // Afturljós Yaris: seljandi á hana og kaupandi hefur samtal um hana
    const [l] = await t.q<{ id: string }>(`select id from listings where title = 'Afturljós Yaris'`);
    await t.as(buyer);
    await t.q(`select record_view($1)`, [l.id]);
    await t.as(null);
    await t.q(`select record_view($1)`, [l.id]);
    await t.as(seller);
    await t.q(`select record_view($1)`, [l.id]); // seljandinn sjálfur telst ekki
    const stats = await t.q<{ listing_id: string; views: number; favorites: number; chats: number }>(`select * from my_listing_stats()`);
    const s = stats.find((x) => x.listing_id === l.id)!;
    expect(s.views).toBe(2);
    expect(s.chats).toBe(1);
    // Kaupandinn sér enga tölfræði fyrir auglýsingar annarra, og nafnlaus má ekki kalla á fallið
    await t.as(buyer);
    expect((await t.q(`select * from my_listing_stats()`)).find((x: { listing_id?: string }) => x.listing_id === l.id)).toBeUndefined();
    await t.as(null);
    await expect(t.q(`select * from my_listing_stats()`)).rejects.toThrow();
  });

  it("ýta upp: aðeins seljandi, einu sinni á 7 dögum", async () => {
    const [l] = await t.q<{ id: string }>(`select id from listings where title = 'Ljós tilboð'`);
    await t.as(buyer);
    await expect(t.q(`select bump_listing($1)`, [l.id])).rejects.toThrow(/not_allowed/);
    await t.as(seller);
    await expect(t.q(`select bump_listing($1)`, [l.id])).rejects.toThrow(/too_soon/); // nýbirt
    await t.asAdmin();
    await t.q(`update listings set published_at = now() - interval '8 days' where id = $1`, [l.id]);
    await t.as(seller);
    await t.q(`select bump_listing($1)`, [l.id]);
    await t.as(null);
    const [first] = await t.q<{ title: string }>(`select title from search_listings()`);
    expect(first.title).toBe("Ljós tilboð");
    await t.as(seller);
    await expect(t.q(`select bump_listing($1)`, [l.id])).rejects.toThrow(/too_soon/);
  });

  it("einkunnir: aðeins kaupandi sem seljandi hefur svarað", async () => {
    await t.as(buyer);
    await expect(
      t.q(`insert into reviews (conversation_id, reviewer_id, seller_id, stars) values ($1, $2, $3, 5)`, [conv, buyer, seller]),
    ).rejects.toThrow(); // seljandi hefur ekki svarað enn
    await t.as(seller);
    await t.q(`insert into messages (conversation_id, sender_id, body) values ($1, $2, 'Hæ, já')`, [conv, seller]);

    await t.as(stranger);
    await expect(
      t.q(`insert into reviews (conversation_id, reviewer_id, seller_id, stars) values ($1, $2, $3, 5)`, [conv, stranger, seller]),
    ).rejects.toThrow();
    await t.as(buyer);
    await t.q(`insert into reviews (conversation_id, reviewer_id, seller_id, stars, comment) values ($1, $2, $3, 4, 'Fínt')`, [
      conv,
      buyer,
      seller,
    ]);
    await expect(
      t.q(`insert into reviews (conversation_id, reviewer_id, seller_id, stars) values ($1, $2, $3, 5)`, [conv, buyer, seller]),
    ).rejects.toThrow(); // bara ein á samtal
    await t.as(null);
    const [r] = await t.q<{ average: string; total: number }>(`select * from seller_rating($1)`, [seller]);
    expect(Number(r.average)).toBe(4);
    expect(r.total).toBe(1);
  });

  it("ýtitilkynning: skilaboð til áskrifanda sendast á Worker með leyndarlykli", async () => {
    await t.asAdmin();
    await t.q(`delete from net.requests`);
    await t.as(buyer);
    await t.q(`select save_push_subscription('https://push.example/abc', 'p256dh-key', 'auth-key')`);

    await t.as(seller);
    await t.q(`insert into messages (conversation_id, sender_id, body) values ($1, $2, 'Já, hann er til')`, [conv, seller]);

    await t.asAdmin();
    const [cfg] = await t.q<{ secret: string; endpoint: string }>(`select secret, endpoint from private.push_config`);
    const reqs = await t.q<{ url: string; body: { kind: string; id: string }; headers: Record<string, string> }>(
      `select url, body, headers from net.requests order by id`,
    );
    expect(reqs).toHaveLength(1); // kaupandi á áskrift, seljandi ekki
    expect(reqs[0].url).toBe(cfg.endpoint);
    expect(reqs[0].body.kind).toBe("message");
    expect(reqs[0].headers["x-partar-secret"]).toBe(cfg.secret);

    await t.as(null);
    await expect(t.q(`select push_payload('rangt', 'message', $1)`, [reqs[0].body.id])).rejects.toThrow(/forbidden/);
    const [{ push_payload: p }] = await t.q<{ push_payload: { message: { title: string; body: string; url: string }; subscriptions: { endpoint: string }[] } }>(
      `select push_payload($1, 'message', $2)`,
      [cfg.secret, reqs[0].body.id],
    );
    expect(p.message.title).toBe("seljandi");
    expect(p.message.body).toBe("Já, hann er til");
    expect(p.message.url).toBe(`/skilabod/${conv}`);
    expect(p.subscriptions.map((s) => s.endpoint)).toEqual(["https://push.example/abc"]);

    // Nafnlaus getur hvorki lesið áskriftir né leyndarlykil beint
    expect(await t.q(`select * from push_subscriptions`)).toHaveLength(0);
    await expect(t.q(`select * from private.push_config`)).rejects.toThrow();

    await t.q(`select remove_push_subscription($1, 'https://push.example/abc')`, [cfg.secret]);
    await t.asAdmin();
    expect(await t.q(`select * from push_subscriptions`)).toHaveLength(0);
  });

  it("ýtitilkynningar: val um tegundir, verðlækkun á uppáhaldi og umsagnir", async () => {
    await t.asAdmin();
    await t.q(`delete from net.requests`);
    const [cfg] = await t.q<{ secret: string }>(`select secret from private.push_config`);
    const sent = async () => {
      await t.asAdmin();
      const r = await t.q<{ body: { kind: string; id: string } }>(`select body from net.requests order by id`);
      await t.q(`delete from net.requests`);
      return r.map((x) => x.body);
    };

    const listing = await publish("Verðprufa ljós", 8000, "gott", "hofudborgarsvaedid", null);
    await t.as(buyer);
    await t.q(`select save_push_subscription('https://push.example/val', 'p256dh-key', 'auth-key')`);
    await t.q(`insert into favorites (user_id, listing_id) values ($1, $2)`, [buyer, listing]);
    await sent();

    // Verðlækkun sendist, hækkun ekki
    await t.as(seller);
    await t.q(`update listings set price_isk = 5000 where id = $1`, [listing]);
    await t.q(`update listings set price_isk = 6000 where id = $1`, [listing]);
    const drops = await sent();
    expect(drops.map((b) => b.kind)).toEqual(["price_drop"]);
    await t.as(null);
    const [{ push_payload: p }] = await t.q<{ push_payload: { message: { title: string; body: string } } }>(
      `select push_payload($1, 'price_drop', $2)`,
      [cfg.secret, drops[0].id],
    );
    expect(p.message.title).toBe("Verðið lækkaði");
    expect(p.message.body).toBe("Verðprufa ljós · 8.000 kr. → 5.000 kr.");

    // Slökkt á verðlækkun og skilaboðum → ekkert sent; aðrir sjá ekki stillingarnar
    await t.as(buyer);
    await t.q(`insert into notification_prefs (user_id, price_drop, messages) values ($1, false, false)`, [buyer]);
    await t.as(stranger);
    expect(await t.q(`select * from notification_prefs`)).toHaveLength(0);
    await t.as(seller);
    await t.q(`update listings set price_isk = 4000 where id = $1`, [listing]);
    await t.q(`insert into messages (conversation_id, sender_id, body) values ($1, $2, 'Lækkaði verðið')`, [conv, seller]);
    expect(await sent()).toEqual([]);

    // Umsögn → seljandi fær tilkynningu
    await t.as(seller);
    await t.q(`select save_push_subscription('https://push.example/seljandi', 'p256dh-key', 'auth-key')`);
    await t.asAdmin();
    await t.q(`delete from reviews`);
    await t.as(buyer);
    await t.q(`insert into reviews (conversation_id, reviewer_id, seller_id, stars, comment) values ($1, $2, $3, 4, 'Fínn seljandi')`, [
      conv,
      buyer,
      seller,
    ]);
    const reviews = await sent();
    expect(reviews.map((b) => b.kind)).toEqual(["review"]);
    await t.as(null);
    const [{ push_payload: r }] = await t.q<{ push_payload: { message: { title: string; body: string } } }>(
      `select push_payload($1, 'review', $2)`,
      [cfg.secret, reviews[0].id],
    );
    expect(r.message.title).toBe("Ný umsögn: ★★★★☆");
    expect(r.message.body).toBe("Fínn seljandi");

    await t.asAdmin();
    await t.q(`delete from push_subscriptions`);
    await t.q(`delete from notification_prefs`);
    await t.q(`delete from listings where id = $1`, [listing]);
  });

  it("tölvupóstur: aðeins án ýtiáskriftar, einn á hvert samtal á 30 mín, og hægt að slökkva", async () => {
    await t.asAdmin();
    await t.q(`delete from net.requests`);
    const [cfg] = await t.q<{ secret: string }>(`select secret from private.push_config`);
    const claim = async (user: string, tag: string) => {
      await t.as(null);
      const [{ claim_email: e }] = await t.q<{ claim_email: string | null }>(`select claim_email($1, $2, $3)`, [cfg.secret, user, tag]);
      return e;
    };

    // Kaupandi á enga áskrift en netfang → beiðni fer á Worker, og payload segir hver fær
    await t.as(seller);
    await t.q(`insert into messages (conversation_id, sender_id, body) values ($1, $2, 'Póstprufa')`, [conv, seller]);
    await t.asAdmin();
    const [req] = await t.q<{ body: { kind: string; id: string } }>(`select body from net.requests`);
    await t.as(null);
    const [{ push_payload: p }] = await t.q<{ push_payload: { user: string } }>(`select push_payload($1, 'message', $2)`, [cfg.secret, req.body.id]);
    expect(p.user).toBe(buyer);

    await expect(t.q(`select claim_email('rangt', $1, 'x')`, [buyer])).rejects.toThrow(/forbidden/);
    expect(await claim(buyer, `samtal-${conv}`)).toBe("kaupandi@test.is");
    expect(await claim(buyer, `samtal-${conv}`)).toBeNull(); // innan 30 mín
    expect(await claim(buyer, "annad-efni")).toBe("kaupandi@test.is");

    // Með ýtiáskrift fer enginn póstur
    await t.as(buyer);
    await t.q(`select save_push_subscription('https://push.example/post', 'p256dh-key', 'auth-key')`);
    expect(await claim(buyer, "thridja-efni")).toBeNull();
    await t.asAdmin();
    await t.q(`delete from push_subscriptions`);

    // Slökkt á pósti → engin beiðni á Worker
    await t.as(buyer);
    await t.q(`insert into notification_prefs (user_id, email) values ($1, false)`, [buyer]);
    expect(await claim(buyer, "fjorda-efni")).toBeNull();
    await t.asAdmin();
    await t.q(`delete from net.requests`);
    await t.as(seller);
    await t.q(`insert into messages (conversation_id, sender_id, body) values ($1, $2, 'Engin tilkynning')`, [conv, seller]);
    await t.asAdmin();
    expect(await t.q(`select * from net.requests`)).toHaveLength(0);
    await t.q(`delete from notification_prefs`);
  });

  it("stjórnborð: aðeins stjórnendur, bönn stöðva sölu og skilaboð", async () => {
    await t.asAdmin();
    await t.q(`insert into admins (user_id) values ($1)`, [stranger]);

    await t.as(buyer);
    await expect(t.q(`select * from admin_stats()`)).rejects.toThrow(/forbidden/);
    await expect(t.q(`select admin_ban_user($1, true)`, [seller])).rejects.toThrow(/forbidden/);

    await t.as(stranger);
    const [stats] = await t.q<{ listings_active: number }>(`select * from admin_stats()`);
    expect(stats.listings_active).toBeGreaterThan(0);
    await t.q(`select admin_ban_user($1, true)`, [seller]);

    await t.as(seller);
    await expect(
      t.q(`insert into listings (seller_id, title, condition, region) values ($1, 'Bannað', 'gott', 'sudurland')`, [seller]),
    ).rejects.toThrow();
    await expect(t.q(`insert into messages (conversation_id, sender_id, body) values ($1, $2, 'hæ')`, [conv, seller])).rejects.toThrow();
    await t.as(null);
    expect(await t.q(`select * from search_listings()`)).toHaveLength(0); // allar auglýsingar faldar

    await t.as(stranger);
    await t.q(`select admin_ban_user($1, false)`, [seller]);
    // Villuskráning: allir mega skrá, aðeins stjórnandi les
    await t.as(null);
    await t.q(`insert into client_errors (message, url) values ('TypeError: x', '/leit')`);
    await expect(t.q(`select * from client_errors`)).resolves.toHaveLength(0);
    await t.as(stranger);
    expect(await t.q(`select * from admin_errors()`)).toHaveLength(1);
  });

  it("myndir í spjalli: aðeins aðilar samtals, og myndskeyti án texta", async () => {
    await t.as(buyer);
    await t.q(`insert into storage.objects (bucket_id, name) values ('chat-images', $1)`, [`${conv}/mynd.webp`]);
    await t.q(`insert into messages (conversation_id, sender_id, body, image_path) values ($1, $2, '', $3)`, [
      conv,
      buyer,
      `${conv}/mynd.webp`,
    ]);
    const [c] = await t.q<{ last_message_body: string }>(`select last_message_body from conversations where id = $1`, [conv]);
    expect(c.last_message_body).toBe("📷 Mynd");
    // Mynd úr öðru samtali má ekki tengja
    await expect(
      t.q(`insert into messages (conversation_id, sender_id, body, image_path) values ($1, $2, '', 'annad/x.webp')`, [conv, buyer]),
    ).rejects.toThrow();
    // Tóm skilaboð án myndar eru ekki leyfð
    await expect(t.q(`insert into messages (conversation_id, sender_id, body) values ($1, $2, '')`, [conv, buyer])).rejects.toThrow();

    await t.as(stranger);
    await expect(
      t.q(`insert into storage.objects (bucket_id, name) values ('chat-images', $1)`, [`${conv}/hakk.webp`]),
    ).rejects.toThrow();
    expect(await t.q(`select * from storage.objects where bucket_id = 'chat-images'`)).toHaveLength(0);
  });

  it("eyðing aðgangs fjarlægir prófíl, auglýsingar og samtöl", async () => {
    await t.as(seller);
    await t.q(`select delete_my_account()`);
    await t.asAdmin();
    const [c] = await t.q<{ users: number; listings: number; convs: number }>(
      `select (select count(*)::int from auth.users where id = $1) users,
              (select count(*)::int from listings where seller_id = $1) listings,
              (select count(*)::int from conversations where seller_id = $1) convs`,
      [seller],
    );
    expect(c).toEqual({ users: 0, listings: 0, convs: 0 });
    await t.as(null);
    await expect(t.q(`select delete_my_account()`)).rejects.toThrow();
  });

  it("notandi les aðeins eigin myndir í geymslu (þarf til að geta eytt þeim)", async () => {
    await t.asAdmin();
    await t.q(`insert into storage.objects (bucket_id, name) values ('listing-images', $1), ('listing-images', $2)`, [
      `${seller}/x/a.webp`,
      `${buyer}/y/b.webp`,
    ]);
    await t.as(seller);
    const rows = await t.q<{ name: string }>(`select name from storage.objects`);
    expect(rows.map((r) => r.name)).toEqual([`${seller}/x/a.webp`]);
  });

});

describe("sameining aðganga (gestur → aðgangur sem er til)", () => {
  it("flytur auglýsingar, óskir, uppáhalds og stjórnandaréttindi og eyðir gestinum", async () => {
    const guest = await t.createUser(null);
    const owner = await t.createUser("eigandi@test.is");
    await t.asAdmin();
    await t.q(`insert into admins (user_id) values ($1)`, [guest]);
    await t.q(`update profiles set display_name = 'Lúkas' where id = $1`, [guest]);

    await t.as(guest, { anonymous: true });
    const [l] = await t.q<{ id: string }>(
      `insert into listings (seller_id, title, condition, region, universal_fit) values ($1, 'Gestaauglýsing', 'gott', 'sudurland', true) returning id`,
      [guest],
    );
    await t.q(`insert into favorites (user_id, listing_id) values ($1, $2)`, [guest, l.id]);
    await t.q(`insert into wanted_requests (user_id, query) values ($1, 'felgur')`, [guest]);
    const [{ create_merge_token: token }] = await t.q<{ create_merge_token: string }>(`select create_merge_token()`);

    // Innskráður (ekki gestur) getur ekki búið til lykil
    await t.as(owner);
    await expect(t.q(`select create_merge_token()`)).rejects.toThrow(/not_guest/);
    // Rangur lykill
    await expect(t.q(`select claim_merge_token('rangt')`)).rejects.toThrow(/invalid_token/);

    const [{ claim_merge_token: moved }] = await t.q<{ claim_merge_token: number }>(`select claim_merge_token($1)`, [token]);
    expect(moved).toBe(1);
    await expect(t.q(`select claim_merge_token($1)`, [token])).rejects.toThrow(/invalid_token/); // einnota

    await t.asAdmin();
    const [s] = await t.q<{ seller: string; favs: number; wants: number; admin: number; guests: number; name: string }>(
      `select (select seller_id::text from listings where id = $1) seller,
              (select count(*)::int from favorites where user_id = $2) favs,
              (select count(*)::int from wanted_requests where user_id = $2) wants,
              (select count(*)::int from admins where user_id = $2) admin,
              (select count(*)::int from auth.users where id = $3) guests,
              (select display_name from profiles where id = $2) name`,
      [l.id, owner, guest],
    );
    expect(s).toEqual({ seller: owner, favs: 1, wants: 1, admin: 1, guests: 0, name: "Lúkas" });
  });
});
