"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Zap,
  ShieldCheck,
  Building,
  Navigation,
  Loader2,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";

interface PospitaAddress {
  zipcode: string;
  prefecture: string;
  city: string;
  town: string;
  full_address?: string;
  kana_prefecture?: string;
  kana_city?: string;
  kana_town?: string;
  kana_full?: string;
}

interface PospitaSuccessResponse {
  status: "success";
  count: number;
  results: PospitaAddress[];
}

interface PospitaErrorResponse {
  status: "error";
  code: string;
  message: string;
}

export default function PospitaFormDemo() {
  const [activeTab, setActiveTab] = useState<"auto-fill" | "reverse" | "verify">("auto-fill");

  // Tab 1: Auto Fill Form State
  const [zipcode, setZipcode] = useState("");
  const [prefecture, setPrefecture] = useState("");
  const [city, setCity] = useState("");
  const [town, setTown] = useState("");
  const [addressKana, setAddressKana] = useState("");
  const [street, setStreet] = useState("");

  const [isLoadingZip, setIsLoadingZip] = useState(false);
  const [zipStatus, setZipStatus] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);

  // Tab 2: Reverse Search State
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<PospitaAddress[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Tab 3: Verification State
  const [vZip, setVZip] = useState("100-0001");
  const [vAddress, setVAddress] = useState("東京都千代田区千代田");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ isMatch: boolean; message: string; data?: any } | null>(null);

  // Copy state for feedback
  const [copiedZip, setCopiedZip] = useState<string | null>(null);

  // Auto fetch address when zipcode reaches 7 digits
  useEffect(() => {
    const cleanedZip = zipcode.replace(/\D/g, "");
    if (cleanedZip.length === 7) {
      fetchAddressByZipcode(cleanedZip);
    } else {
      setZipStatus(null);
    }
  }, [zipcode]);

  // Function 1: Fetch address by postal code using updated pospita API
  const fetchAddressByZipcode = async (zip7: string) => {
    setIsLoadingZip(true);
    setZipStatus({ type: "info", msg: "pospita APIから住所データを取得中..." });

    try {
      // Calling official pospita API endpoint: GET /api/v1/addresses/{zipcode}
      const res = await fetch(`https://pospita.jp/api/v1/addresses/${zip7}`);

      if (!res.ok) {
        if (res.status === 404) {
          const errData: PospitaErrorResponse = await res.json();
          setZipStatus({
            type: "error",
            msg: `⚠️ ${errData.message || "該当する郵便番号が見つかりませんでした。"}`,
          });
          return;
        }
        throw new Error(`APIエラー (${res.status})`);
      }

      const data: PospitaSuccessResponse = await res.json();

      // Clean & standardized response: data.results is ALWAYS an array!
      if (data.results && data.results.length > 0) {
        const item = data.results[0];
        setPrefecture(item.prefecture || "");
        setCity(item.city || "");
        setTown(item.town || "");
        setAddressKana(item.kana_full || "");

        setZipStatus({
          type: "success",
          msg: `✨ 住所を自動入力しました！ (${item.prefecture}${item.city}${item.town})`,
        });
      }
    } catch (err: any) {
      console.error("pospita API Fetch Error:", err);
      setZipStatus({
        type: "error",
        msg: "住所の取得に失敗しました。ネットワーク状況をご確認ください。",
      });
    } finally {
      setIsLoadingZip(false);
    }
  };

  // Function 2: Reverse search address by keyword
  const handleAddressSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchKeyword.trim()) return;

    setIsSearchingAddress(true);
    setHasSearched(true);

    try {
      // Calling official pospita API reverse search: GET /api/v1/addresses?address={keyword}
      const res = await fetch(`https://pospita.jp/api/v1/addresses?address=${encodeURIComponent(searchKeyword.trim())}`);
      if (!res.ok) throw new Error("API Exception");

      const data: PospitaSuccessResponse = await res.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error(err);
      setSearchResults([]);
    } finally {
      setIsSearchingAddress(false);
    }
  };

  // Function 3: Verify Zipcode & Address consistency
  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsVerifying(true);
    setVerifyResult(null);

    const cleanZip = vZip.replace(/\D/g, "");

    try {
      const res = await fetch(`https://pospita.jp/api/v1/addresses/${cleanZip}`);
      if (!res.ok) {
        if (res.status === 404) {
          const errData: PospitaErrorResponse = await res.json();
          setVerifyResult({
            isMatch: false,
            message: `⚠️ ${errData.message}`,
          });
          return;
        }
        throw new Error("Validation failed");
      }

      const data: PospitaSuccessResponse = await res.json();
      const list = data.results || [];

      if (list.length === 0) {
        setVerifyResult({
          isMatch: false,
          message: "指定された郵便番号の登録情報が見つかりませんでした。",
        });
        return;
      }

      // Check if user input address matches prefecture & city/town
      const matched = list.find((item: PospitaAddress) => {
        return vAddress.includes(item.prefecture) && (vAddress.includes(item.city) || vAddress.includes(item.town));
      });

      if (matched) {
        setVerifyResult({
          isMatch: true,
          message: `✅ 整合性確認OK: 「${matched.prefecture}${matched.city}${matched.town}」と一致しました！`,
          data: matched,
        });
      } else {
        const expected = list.map((i: PospitaAddress) => `${i.prefecture}${i.city}${i.town}`).join(" または ");
        setVerifyResult({
          isMatch: false,
          message: `⚠️ 不一致: 郵便番号 〒${vZip} に対応する正しい住所は 「${expected}」 です。`,
        });
      }
    } catch (err) {
      setVerifyResult({
        isMatch: false,
        message: "検証処理中にエラーが発生しました。",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedZip(text);
    setTimeout(() => setCopiedZip(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      {/* Background Radial Glow */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(225,77,42,0.15),transparent_60%)] pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-20 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center font-black text-white shadow-lg shadow-orange-500/30 text-xl font-mono">
              P
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl text-white tracking-tight">pospita</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-mono font-bold uppercase border border-orange-500/30">
                  Next.js Demo
                </span>
              </div>
            </div>
          </div>

          <a
            href="https://pospita.jp/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-orange-400 bg-slate-800 hover:bg-slate-700 px-3.5 py-2 rounded-lg border border-slate-700 transition-all shadow-sm"
          >
            <span>pospita.jp 公式</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="relative z-10 flex-1 max-w-5xl mx-auto px-6 py-10 flex flex-col gap-8 w-full">
        {/* Banner Section */}
        <section className="text-center flex flex-col items-center gap-4 pt-4">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3.5 py-1.5 rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            <span>AI時代の郵便番号API「pospita」組み込みデモ</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight max-w-3xl">
            爆速＆事前登録不要の <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500">
              住所自動入力フォーム
            </span>
          </h1>

          <p className="text-slate-400 text-sm sm:text-base max-w-2xl leading-relaxed">
            APIキー不要・1日1,000回まで無料の <strong className="text-slate-200">pospita</strong> APIをNext.js App Routerで呼び出しています。
            郵便番号入力からのリアルタイム補完・ふりがな自動付与・住所逆引きを体験いただけます。
          </p>
        </section>

        {/* Tab Navigation Controls */}
        <div className="flex justify-center border-b border-slate-800">
          <div className="flex gap-2 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl">
            <button
              onClick={() => setActiveTab("auto-fill")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === "auto-fill"
                  ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>01. 住所自動入力 & ふりがな</span>
            </button>

            <button
              onClick={() => setActiveTab("reverse")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === "reverse"
                  ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Search className="w-4 h-4" />
              <span>02. 住所からの逆引き検索</span>
            </button>

            <button
              onClick={() => setActiveTab("verify")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === "verify"
                  ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>03. 住所整合性チェック</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Address Auto Fill Demo */}
        {activeTab === "auto-fill" && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Building className="w-5 h-5 text-orange-400" />
                  <span>お届け先住所入力フォーム</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  7桁の郵便番号（例: 1000001 または 100-0001）を入れると、pospitaが即時に住所とふりがなを保管します。
                </p>
              </div>

              {/* Sample Quick Fill Buttons */}
              <div className="hidden md:flex items-center gap-1.5 text-xs">
                <span className="text-slate-500">お試し:</span>
                {[
                  { label: "皇居", code: "100-0001" },
                  { label: "東京駅", code: "100-0005" },
                  { label: "新宿", code: "160-0022" },
                  { label: "大阪梅田", code: "530-0001" },
                  { label: "無効番号", code: "999-9999" },
                ].map((sample) => (
                  <button
                    key={sample.code}
                    type="button"
                    onClick={() => setZipcode(sample.code)}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-orange-300 font-mono transition-colors text-[11px]"
                  >
                    {sample.label} ({sample.code})
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={(e) => e.preventDefault()} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Postal Code Field */}
              <div className="md:col-span-2 flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span>郵便番号</span>
                    <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded font-mono">
                      必須
                    </span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">ハイフンなし/あり両対応</span>
                </label>

                <div className="relative">
                  <input
                    type="text"
                    value={zipcode}
                    onChange={(e) => setZipcode(e.target.value)}
                    placeholder="例: 100-0001"
                    maxLength={8}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl px-4 py-3 text-slate-100 font-mono text-base tracking-wider transition-all placeholder:text-slate-600 outline-none"
                  />
                  {isLoadingZip && (
                    <div className="absolute right-3.5 top-3.5 flex items-center gap-2 text-xs text-orange-400">
                      <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                    </div>
                  )}
                </div>

                {/* API Fetch Status Feedback Message */}
                {zipStatus && (
                  <div
                    className={`mt-1 text-xs px-3.5 py-2 rounded-xl flex items-center gap-2 border font-medium ${
                      zipStatus.type === "success"
                        ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                        : zipStatus.type === "error"
                        ? "bg-rose-950/60 border-rose-800 text-rose-300"
                        : "bg-slate-800/80 border-slate-700 text-slate-300"
                    }`}
                  >
                    {zipStatus.type === "success" && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />}
                    {zipStatus.type === "error" && <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
                    {zipStatus.type === "info" && <Loader2 className="w-4 h-4 shrink-0 animate-spin text-orange-400" />}
                    <span>{zipStatus.msg}</span>
                  </div>
                )}
              </div>

              {/* Prefecture */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-300">都道府県</label>
                <input
                  type="text"
                  value={prefecture}
                  onChange={(e) => setPrefecture(e.target.value)}
                  placeholder="例: 東京都"
                  className="bg-slate-950 border border-slate-700 focus:border-orange-500 rounded-xl px-4 py-3 text-slate-100 text-sm transition-all outline-none"
                />
              </div>

              {/* City */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-300">市区町村</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="例: 千代田区"
                  className="bg-slate-950 border border-slate-700 focus:border-orange-500 rounded-xl px-4 py-3 text-slate-100 text-sm transition-all outline-none"
                />
              </div>

              {/* Town */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-300">町名・町域</label>
                <input
                  type="text"
                  value={town}
                  onChange={(e) => setTown(e.target.value)}
                  placeholder="例: 千代田"
                  className="bg-slate-950 border border-slate-700 focus:border-orange-500 rounded-xl px-4 py-3 text-slate-100 text-sm transition-all outline-none"
                />
              </div>

              {/* Address Kana */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>ふりがな（pospita自動取得）</span>
                  <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded font-mono">
                    自動入力
                  </span>
                </label>
                <input
                  type="text"
                  value={addressKana}
                  onChange={(e) => setAddressKana(e.target.value)}
                  placeholder="例: とうきょうとちよだくちよだ"
                  className="bg-slate-950 border border-slate-700 focus:border-orange-500 rounded-xl px-4 py-3 text-slate-200 text-sm transition-all outline-none"
                />
              </div>

              {/* Street / Building (Manual input) */}
              <div className="md:col-span-2 flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-300">丁目・番地・建物名など</label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="例: 1-1"
                  className="bg-slate-950 border border-slate-700 focus:border-orange-500 rounded-xl px-4 py-3 text-slate-100 text-sm transition-all outline-none"
                />
              </div>
            </form>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2 font-mono text-xs">
              <div className="text-slate-400 text-[11px] font-sans font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                <span>pospita API 呼び出しコード snippet</span>
              </div>
              <pre className="text-orange-300 overflow-x-auto p-2 bg-slate-900/80 rounded-lg">
                {`const res = await fetch("https://pospita.jp/api/v1/addresses/${zipcode.replace(/\D/g, "") || "1000001"}");\nconst data: { count: number; results: Address[] } = await res.json();\nconst item = data.results[0];`}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 2: Reverse Address Search */}
        {activeTab === "reverse" && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6">
            <div className="border-b border-slate-800/80 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Navigation className="w-5 h-5 text-orange-400" />
                <span>住所キーワードからの郵便番号逆引き検索</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                「新宿」「大手町」など住所の一部を入力すると、対応する郵便番号候補をpospitaが高速逆引きします。
              </p>
            </div>

            <form onSubmit={handleAddressSearch} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-500" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="住所キーワードを入力（例: 新宿, 大手町, 横浜市）"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl pl-11 pr-4 py-3 text-slate-100 text-sm transition-all outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSearchingAddress || !searchKeyword.trim()}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 shrink-0"
              >
                {isSearchingAddress ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>検索中...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>逆引き検索</span>
                  </>
                )}
              </button>
            </form>

            {/* Results Grid */}
            <div className="flex flex-col gap-3">
              {hasSearched && (
                <div className="text-xs text-slate-400 font-mono">
                  検索キーワード: &quot;{searchKeyword}&quot; &bull; {searchResults.length} 件ヒット
                </div>
              )}

              {searchResults.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {searchResults.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950 border border-slate-800 hover:border-orange-500/50 rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-base font-bold text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-lg border border-orange-500/20">
                          〒{item.zipcode}
                        </span>
                        <button
                          onClick={() => copyToClipboard(item.zipcode)}
                          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors"
                        >
                          {copiedZip === item.zipcode ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">コピー完了</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>コピー</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div>
                        <div className="text-sm font-bold text-slate-100">
                          {item.prefecture} {item.city} {item.town}
                        </div>
                        {item.kana_full && (
                          <div className="text-xs text-slate-500 font-mono mt-0.5">
                            {item.kana_full}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : hasSearched && !isSearchingAddress ? (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
                  該当する住所が見つかりませんでした。キーワードを変更してお試しください。
                </div>
              ) : (
                <div className="bg-slate-950/50 border border-dashed border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-sm">
                  キーワードを入力して「逆引き検索」ボタンを押してください。
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Address Verification */}
        {activeTab === "verify" && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6">
            <div className="border-b border-slate-800/80 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-orange-400" />
                <span>郵便番号 × 住所 整合性自動検証</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                ユーザーが手入力した「郵便番号」と「住所」が正しく一致しているかをpospitaが自動チェックします。
              </p>
            </div>

            <form onSubmit={handleVerify} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-300">検証用 郵便番号</label>
                <input
                  type="text"
                  value={vZip}
                  onChange={(e) => setVZip(e.target.value)}
                  placeholder="例: 100-0001"
                  className="bg-slate-950 border border-slate-700 focus:border-orange-500 rounded-xl px-4 py-3 text-slate-100 font-mono text-sm outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-300">検証用 住所文字列</label>
                <input
                  type="text"
                  value={vAddress}
                  onChange={(e) => setVAddress(e.target.value)}
                  placeholder="例: 東京都千代田区千代田"
                  className="bg-slate-950 border border-slate-700 focus:border-orange-500 rounded-xl px-4 py-3 text-slate-100 text-sm outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>検証中...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>整合性を自動検証する</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Verification Result Feedback */}
            {verifyResult && (
              <div
                className={`p-5 rounded-2xl border flex flex-col gap-2 font-medium transition-all ${
                  verifyResult.isMatch
                    ? "bg-emerald-950/60 border-emerald-800 text-emerald-200"
                    : "bg-rose-950/60 border-rose-800 text-rose-200"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-base">
                  {verifyResult.isMatch ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-400" />
                  )}
                  <span>{verifyResult.isMatch ? "整合性チェック成功" : "整合性チェック不一致"}</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{verifyResult.message}</p>
              </div>
            )}
          </div>
        )}

        {/* pospita Features Highlight Box */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-orange-400 font-bold text-sm">
              <Zap className="w-4 h-4" />
              <span>事前登録 & APIキー不要</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              登録不要・クレジット登録なしで即日利用可能。1日1,000リクエストまで誰でも無料で使えます。
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-orange-400 font-bold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>ふりがな・カナ自動付与</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              漢字住所と同時にひらがな/カタカナ情報も取得できるため、ECやフォームの入力負荷を半減。
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-orange-400 font-bold text-sm">
              <MapPin className="w-4 h-4" />
              <span>AI & MCP標準対応</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Claude DesktopやCursor、ChatGPTなどのAIが自動検知できるMCP規格およびllms.txtに対応。
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800 py-8 text-center text-xs text-slate-500 bg-slate-950 mt-12">
        <p className="flex items-center justify-center gap-2">
          <span>Powered by</span>
          <a href="https://pospita.jp/" target="_blank" rel="noopener noreferrer" className="text-orange-400 font-bold hover:underline">
            pospita (ポスピタ)
          </a>
          <span>&bull; Built with Next.js App Router & Tailwind CSS</span>
        </p>
      </footer>
    </div>
  );
}
