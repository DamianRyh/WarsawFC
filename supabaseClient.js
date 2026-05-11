window.WFC_SUPABASE = {
  client: null,

  init() {
    if (!window.supabase || !window.WFC_CONFIG?.SUPABASE_URL) return null;
    if (!this.client) {
      this.client = window.supabase.createClient(
        window.WFC_CONFIG.SUPABASE_URL,
        window.WFC_CONFIG.SUPABASE_PUBLISHABLE_KEY
      );
    }
    return this.client;
  },

  async getSession() {
    const sb = this.init();
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data.session || null;
  },

  async signIn(email, password) {
    const sb = this.init();
    if (!sb) throw new Error("Supabase nie jest dostępny");
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  },

  async signUp(email, password, meta = {}) {
    const sb = this.init();
    if (!sb) throw new Error("Supabase nie jest dostępny");
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: meta }
    });
    if (error) throw error;
    return data.user;
  },

  async signOut() {
    const sb = this.init();
    if (!sb) return;
    await sb.auth.signOut();
  },

  async getProfile(userId) {
    const sb = this.init();
    if (!sb || !userId) return null;
    const { data, error } = await sb.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) throw error;
    return data;
  },

  async upsertProfile(user, profile) {
    const sb = this.init();
    if (!sb || !user) return null;
    const payload = {
      id: user.id,
      nickname: profile.nickname || user.email?.split("@")[0],
      full_name: profile.full_name || profile.nickname || "",
      instagram: profile.instagram || "",
      position: profile.position || "",
      avatar_url: profile.avatar_url || "",
      role: profile.role || "player",
      bio: profile.bio || ""
    };
    const { data, error } = await sb.from("profiles").upsert(payload).select().single();
    if (error) throw error;
    return data;
  },

  async fetchProfiles() {
    const sb = this.init();
    if (!sb) return [];
    const { data, error } = await sb.from("profiles").select("*").order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async upsertEvent(event) {
    const sb = this.init();
    if (!sb) return null;
    const { data, error } = await sb.from("events").upsert({
      code: event.code,
      title: event.title,
      event_date: event.date,
      season: event.season || "S03",
      status: event.status || "completed"
    }, { onConflict: "code" }).select().single();
    if (error) throw error;
    return data;
  }
};
