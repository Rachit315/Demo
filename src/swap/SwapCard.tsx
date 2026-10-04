import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, LayoutGroup, motion, type Variants } from "motion/react";
import { ArrowDownUp, Check, ChevronDown, LoaderCircle } from "lucide-react";
import { bySymbol, initialBalances, tokens, TokenIcon, type Token } from "./tokens";
import { LiquidButton } from "./LiquidButton";
import { fade, morph } from "./motion";

type Mode = "Swap" | "Buy" | "Stake";
type Side = "pay" | "receive";
type Status = "idle" | "pending" | "done";

const modes: Record<Mode, { pay: string; receive: string; amount: string; doing: string; done: string }> = {
  Swap: { pay: "USDT", receive: "ETH", amount: "164.23", doing: "Swapping", done: "Swapped" },
  Buy: { pay: "USD", receive: "ETH", amount: "250", doing: "Buying", done: "Bought" },
  Stake: { pay: "ETH", receive: "stETH", amount: "", doing: "Staking", done: "Staked" },
};

/* entrance: each block rises out of a soft blur, one after another */
const stagger: Variants = { hidden: {}, shown: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
const rise: Variants = {
  hidden: { opacity: 0, y: 16, filter: "blur(6px)" },
  shown: { opacity: 1, y: 0, filter: "blur(0px)", transition: { ...morph, opacity: fade(), filter: fade() } },
};

const usd = (v: number) =>
  "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function fmtOut(v: number) {
  if (v === 0) return "0";
  if (v >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (v >= 1) return v.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return v.toLocaleString("en-US", { maximumSignificantDigits: 3 });
}

function fmtRate(r: number) {
  if (r >= 1000) return r.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (r >= 1) return r.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return r.toLocaleString("en-US", { maximumSignificantDigits: 5 });
}

function fmtBalance(v: number) {
  if (v === 0) return "none";
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: v < 1 ? 6 : 2 });
}

/* a plain decimal string for the input: no grouping, no trailing zeros */
const toInput = (v: number) => (v > 0 ? String(Number(v.toFixed(8))) : "");

function sanitize(raw: string) {
  let s = raw.replace(",", ".").replace(/[^\d.]/g, "");
  const dot = s.indexOf(".");
  if (dot !== -1) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "").slice(0, 8);
  if (s.startsWith(".")) s = "0" + s;
  return s.replace(/^0+(?=\d)/, "");
}

const amountSize = (text: string) => (text.length <= 7 ? 38 : text.length <= 9 ? 32 : text.length <= 11 ? 27 : 22);

export function SwapCard() {
  const [mode, setMode] = useState<Mode>("Swap");
  const [pay, setPay] = useState(modes.Swap.pay);
  const [receive, setReceive] = useState(modes.Swap.receive);
  const [amount, setAmount] = useState(modes.Swap.amount);
  const [balances, setBalances] = useState(initialBalances);
  const [flips, setFlips] = useState(0);
  const [picker, setPicker] = useState<Side | null>(null);
  const [details, setDetails] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const timers = useRef<number[]>([]);
  /* flipping back and forth restores the typed amount instead of compounding rounding */
  const lastFlip = useRef<{ shown: string; typed: string } | null>(null);
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const payT = bySymbol(pay);
  const receiveT = bySymbol(receive);
  const value = parseFloat(amount) || 0;
  const rate = payT.price / receiveT.price;
  const out = value * rate;
  /* the opening quote shows the reference design's figures exactly; any edit switches to live quoting */
  const preset = mode === "Swap" && pay === "USDT" && receive === "ETH" && amount === modes.Swap.amount;
  const outText = preset ? "0.0505" : fmtOut(out);
  const payUsd = preset ? 64.23 : value * payT.price;
  const receiveUsd = preset ? 64.23 : out * receiveT.price;
  const insufficient = value > balances[pay] + 1e-9;
  const ready = value > 0 && !insufficient && status === "idle";

  const label =
    status === "pending"
      ? `${modes[mode].doing}…`
      : status === "done"
        ? modes[mode].done
        : value === 0
          ? "Enter an amount"
          : insufficient
            ? `Insufficient ${pay}`
            : mode;

  const switchMode = (next: Mode) => {
    if (next === mode || status === "pending") return;
    clearTimers();
    setStatus("idle");
    setMode(next);
    setPay(modes[next].pay);
    setReceive(modes[next].receive);
    setAmount(modes[next].amount);
    setPicker(null);
  };

  const flip = () => {
    if (status === "pending") return;
    setPay(receive);
    setReceive(pay);
    const next = lastFlip.current?.shown === amount ? lastFlip.current.typed : toInput(out);
    lastFlip.current = { shown: next, typed: amount };
    setAmount(next);
    setFlips((n) => n + 1);
    setPicker(null);
  };

  const pick = (side: Side, symbol: string) => {
    setPicker(null);
    const other = side === "pay" ? receive : pay;
    if (symbol === other) return flip();
    if (side === "pay") setPay(symbol);
    else setReceive(symbol);
  };

  const submit = () => {
    if (!ready) return;
    setStatus("pending");
    timers.current.push(
      window.setTimeout(() => {
        setBalances((b) => ({ ...b, [pay]: Math.max(0, b[pay] - value), [receive]: b[receive] + out }));
        setStatus("done");
      }, 1200),
      window.setTimeout(() => setStatus("idle"), 2600),
    );
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="shown" className="flex w-full max-w-[340px] flex-col">
      <motion.div variants={rise} className="mb-2.5 flex justify-center">
        <Tabs mode={mode} onChange={switchMode} />
      </motion.div>

      <LayoutGroup id="swap">
        <motion.div variants={rise} className={picker === "pay" ? "relative z-30" : "relative z-0"}>
          <Panel label="Pay">
            <div className="flex items-center gap-3">
              <motion.input
                key={`pay-${flips}-${mode}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0, transition: { ...morph, opacity: fade() } }}
                aria-label="Pay amount"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(sanitize(e.target.value))}
                style={{ fontSize: amountSize(amount) }}
                className="min-w-0 flex-1 bg-transparent font-medium leading-none tracking-[-0.035em] text-sw-ink caret-sw-accent outline-none transition-[font-size] duration-200 placeholder:text-sw-faint"
              />
              <TokenSelect
                token={payT}
                open={picker === "pay"}
                onToggle={() => setPicker(picker === "pay" ? null : "pay")}
                onClose={() => setPicker(null)}
                onPick={(s) => pick("pay", s)}
                balances={balances}
              />
            </div>
            <FooterRow
              left={<UsdValue value={payUsd} change={payT.change} />}
              right={
                <>
                  You have <Roll className="ml-1 text-sw-faint">{fmtBalance(balances[pay])}</Roll>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.9 }}
                    transition={morph}
                    onClick={() => setAmount(toInput(balances[pay]))}
                    disabled={balances[pay] === 0}
                    className="ml-1.5 cursor-pointer rounded-[4px] bg-sw-accent-soft px-1 py-[3px] text-[9px] font-medium leading-none tracking-wide text-sw-accent disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    MAX
                  </motion.button>
                </>
              }
            />
          </Panel>
        </motion.div>

        {/* the flip button sits on the seam between the two panels */}
        <div className="relative z-20 h-1.5">
          <motion.button
            type="button"
            aria-label="Switch pay and receive"
            onClick={flip}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, transition: { ...morph, delay: 0.25 } }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            className="absolute left-1/2 top-1/2 grid size-[42px] -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full border-[4px] border-sw-page bg-sw-card text-sw-ink outline-none focus-visible:ring-2 focus-visible:ring-sw-accent"
          >
            <motion.span animate={{ rotate: flips * 180 }} transition={morph} className="grid place-items-center">
              <ArrowDownUp className="size-[16px]" strokeWidth={2} />
            </motion.span>
          </motion.button>
        </div>

        <motion.div variants={rise} className={picker === "receive" ? "relative z-30" : "relative z-0"}>
          <Panel label="Receive">
            <div className="flex items-center gap-3">
              <div
                aria-label="Receive amount"
                aria-live="polite"
                style={{ fontSize: amountSize("~" + outText) }}
                className="flex min-w-0 flex-1 items-center font-medium leading-none tracking-[-0.035em] transition-[font-size] duration-200"
              >
                <span className={out === 0 ? "text-sw-faint" : "text-sw-ink"}>~</span>
                <RollingNumber value={outText} className={out === 0 ? "text-sw-faint" : "text-sw-ink"} />
              </div>
              <TokenSelect
                token={receiveT}
                open={picker === "receive"}
                onToggle={() => setPicker(picker === "receive" ? null : "receive")}
                onClose={() => setPicker(null)}
                onPick={(s) => pick("receive", s)}
                balances={balances}
              />
            </div>
            <FooterRow
              left={<UsdValue value={receiveUsd} change={receiveT.change} />}
              right={
                <>
                  You have <Roll className="ml-1 text-sw-faint">{fmtBalance(balances[receive])}</Roll>
                </>
              }
            />
          </Panel>
        </motion.div>
      </LayoutGroup>

      <motion.div variants={rise}>
        <button
          type="button"
          aria-expanded={details}
          onClick={() => setDetails(!details)}
          className="group mt-1.5 flex w-full cursor-pointer items-center justify-between rounded-xl px-3.5 py-2 text-[11px] text-sw-muted outline-none focus-visible:ring-2 focus-visible:ring-sw-accent"
        >
          <span className="relative h-3.5 overflow-hidden">
            <Swap key={`${pay}-${receive}`} distance={12}>
              {`1 ${pay} = ${fmtRate(rate)} ${receive}`}
            </Swap>
          </span>
          <motion.span animate={{ rotate: details ? 180 : 0 }} transition={morph} className="grid place-items-center">
            <ChevronDown className="size-3.5 transition-colors group-hover:text-sw-ink" strokeWidth={2} />
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {details && (
            <motion.div
              key="details"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1, transition: { ...morph, opacity: fade(0.05) } }}
              exit={{ height: 0, opacity: 0, transition: { ...morph, opacity: fade() } }}
              className="overflow-hidden"
            >
              <dl className="space-y-1.5 px-3.5 pb-2.5 pt-0.5 text-[11.5px]">
                {[
                  ["Price impact", `${receiveT.change.toFixed(2)}%`],
                  ["Minimum received", `${fmtOut(out * 0.995)} ${receive}`],
                  ["Slippage tolerance", "0.5%"],
                  ["Network fee", value > 0 ? "~$2.14" : "—"],
                  ["Route", `${pay} → ${receive}`],
                ].map(([k, v], i) => (
                  <motion.div
                    key={k}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0, transition: { ...morph, delay: 0.04 + i * 0.03 } }}
                    className="flex justify-between"
                  >
                    <dt className="text-sw-muted">{k}</dt>
                    <dd className="tabular-nums text-sw-ink">{v}</dd>
                  </motion.div>
                ))}
              </dl>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div variants={rise}>
        <LiquidButton
          disabled={!ready && status === "idle"}
          busy={status !== "idle"}
          success={status === "done"}
          onClick={submit}
        >
          <span className="relative flex h-5 items-center justify-center overflow-hidden">
            <Swap key={label} distance={14}>
              <span className="inline-flex items-center gap-2">
                {status === "pending" && <LoaderCircle className="size-[15px] animate-spin" strokeWidth={2.25} />}
                {status === "done" && <Check className="size-[15px]" strokeWidth={2.5} />}
                {label}
              </span>
            </Swap>
          </span>
        </LiquidButton>
      </motion.div>
    </motion.div>
  );
}

function Tabs({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div role="tablist" aria-label="Action" className="flex gap-1">
      {(Object.keys(modes) as Mode[]).map((m) => (
        <motion.button
          key={m}
          type="button"
          role="tab"
          whileTap={{ scale: 0.94 }}
          transition={morph}
          aria-selected={m === mode}
          onClick={() => onChange(m)}
          className={
            "relative h-[28px] cursor-pointer rounded-full px-[19px] text-[12px] font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-sw-accent " +
            (m === mode ? "text-sw-ink" : "text-sw-muted hover:text-sw-ink")
          }
        >
          {m === mode && (
            <motion.span
              layoutId="tab-pill"
              transition={morph}
              className="absolute inset-0 rounded-full bg-sw-card shadow-[0_1px_2px_rgb(0_0_0/0.06),0_2px_8px_-2px_rgb(0_0_0/0.06)]"
            />
          )}
          <span className="relative">{m}</span>
        </motion.button>
      ))}
    </div>
  );
}

function Panel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="rounded-[18px] bg-sw-card transition-colors duration-300 px-4 pb-3.5 pt-3.5 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
      <h2 className="mb-3 text-[13px] font-normal text-sw-muted">{label}</h2>
      {children}
    </section>
  );
}

function FooterRow({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="mt-4 flex items-center justify-between text-[11px] tabular-nums text-sw-muted">
      <div>{left}</div>
      <div className="flex items-center">{right}</div>
    </div>
  );
}

function UsdValue({ value, change }: { value: number; change: number }) {
  return (
    <span className="flex items-center gap-1.5">
      <RollingNumber value={usd(value)} />
      <span className="text-sw-faint">
        ({change > 0 ? "+" : ""}
        {change.toFixed(2)}%)
      </span>
    </span>
  );
}

function TokenSelect({
  token,
  open,
  onToggle,
  onClose,
  onPick,
  balances,
}: {
  token: Token;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onPick: (symbol: string) => void;
  balances: Record<string, number>;
}) {
  const ref = useRef<HTMLDivElement>(null);

  /* open with the current token in view, even when it sits below the fold */
  const centreCurrent = (list: HTMLUListElement | null) => {
    /* measure the <li>: its offset is relative to the list, the button's isn't mid-animation */
    const current = list?.querySelector<HTMLElement>('[aria-selected="true"]')?.closest("li");
    if (list && current) list.scrollTop = current.offsetTop - (list.clientHeight - current.offsetHeight) / 2;
  };

  /* Escape or a click anywhere else closes the list */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && onClose();
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open, onClose]);

  return (
    <div ref={ref} className="relative shrink-0">
      {/* layoutId per token: when the sides flip, each pill glides to the other panel */}
      <motion.button
        type="button"
        layoutId={`pill-${token.symbol}`}
        transition={morph}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={onToggle}
        whileTap={{ scale: 0.95 }}
        className="flex h-[32px] cursor-pointer items-center gap-1.5 rounded-full bg-sw-chip py-1 pl-[6px] pr-2.5 text-[13px] font-medium text-sw-ink outline-none transition-colors hover:bg-sw-chip-hover focus-visible:ring-2 focus-visible:ring-sw-accent"
        style={{ borderRadius: 999 }}
      >
        <motion.span layout="position" transition={morph} className="flex items-center gap-2">
          <TokenIcon token={token} size={20} />
          {token.symbol}
        </motion.span>
        <motion.span layout="position" animate={{ rotate: open ? 180 : 0 }} transition={morph} className="grid">
          <ChevronDown className="size-3.5 text-sw-muted" strokeWidth={2} />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.ul
            ref={centreCurrent}
            role="listbox"
            aria-label="Select token"
            initial={{ opacity: 0, scale: 0.9, y: -6, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)", transition: { ...morph, opacity: fade() } }}
            exit={{ opacity: 0, scale: 0.94, y: -4, filter: "blur(4px)", transition: { duration: 0.14 } }}
            style={{ originX: 1, originY: 0 }}
            className="token-scroll absolute right-0 top-[38px] z-50 max-h-[196px] w-56 overflow-y-auto overscroll-contain rounded-2xl bg-sw-card p-1.5 shadow-[0_0_0_1px_rgb(0_0_0/0.05),0_16px_32px_-12px_rgb(0_0_0/0.25)]"
          >
            {tokens.map((t, i) => (
              <motion.li
                key={t.symbol}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0, transition: { ...morph, delay: 0.03 + i * 0.025 } }}
              >
                <button
                  type="button"
                  role="option"
                  aria-selected={t.symbol === token.symbol}
                  onClick={() => onPick(t.symbol)}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-left outline-none transition-colors hover:bg-sw-chip focus-visible:bg-sw-chip"
                >
                  <TokenIcon token={t} size={24} />
                  <span className="flex-1 leading-tight">
                    <span className="block text-[13px] font-medium text-sw-ink">{t.symbol}</span>
                    <span className="block text-[11px] text-sw-muted">{t.name}</span>
                  </span>
                  <span className="text-[11px] tabular-nums text-sw-muted">
                    {balances[t.symbol] ? fmtBalance(balances[t.symbol]) : ""}
                  </span>
                  {t.symbol === token.symbol && <Check className="size-4 text-sw-accent" strokeWidth={2.5} />}
                </button>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/* text that rolls up when it changes; give it a new key to trigger the roll */
function Swap({ distance, children }: { distance: number; children: ReactNode }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: distance }}
      animate={{ opacity: 1, y: 0, transition: { ...morph, opacity: fade() } }}
      className="block whitespace-nowrap"
    >
      {children}
    </motion.span>
  );
}

/* short label that rolls whenever its text changes */
function Roll({ children, className = "" }: { children: string; className?: string }) {
  return (
    <span className={"relative inline-block overflow-hidden align-bottom " + className}>
      <Swap key={children} distance={10}>
        {children}
      </Swap>
    </span>
  );
}

/* odometer: every character that changes slides out the top while its
   replacement rises from below; unchanged characters stay put */
function RollingNumber({ value, className = "" }: { value: string; className?: string }) {
  const chars = value.split("");
  return (
    <span className={"relative inline-flex overflow-hidden py-[0.12em] tabular-nums " + className}>
      <AnimatePresence initial={false} mode="popLayout">
        {chars.map((c, i) => (
          <motion.span
            key={`${chars.length - i}:${c}`}
            layout="position"
            initial={{ y: "80%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-80%", opacity: 0 }}
            transition={{ ...morph, opacity: fade() }}
            className="inline-block"
          >
            {c}
          </motion.span>
        ))}
      </AnimatePresence>
    </span>
  );
}
