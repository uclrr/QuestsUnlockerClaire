//@version=6
indicator("RR & TP Planner (3 Targets) — open source", overlay=true, max_lines_count=100, max_labels_count=100, max_boxes_count=20)

// ===== Inputs
dirLong         = input.string("Long", options=["Long","Short"], title="Direction")
entryPrice      = input.float(na, "Entry Price (leave NA to use close)", step=tick.new(syminfo.mintick).pointvalue)
slPrice         = input.float(na, "Stop Loss Price", step=tick.new(syminfo.mintick).pointvalue)
useRMultiples   = input.bool(true, "Targets by R multiples?")
tpR1            = input.float(1.0, "TP1 (R)", step=0.1)
tpR2            = input.float(2.0, "TP2 (R)", step=0.1)
tpR3            = input.float(3.0, "TP3 (R)", step=0.1)
tpPts1          = input.float(0.0, "TP1 distance (points)", step=syminfo.mintick)
tpPts2          = input.float(0.0, "TP2 distance (points)", step=syminfo.mintick)
tpPts3          = input.float(0.0, "TP3 distance (points)", step=syminfo.mintick)

acctSize        = input.float(1000, "Account Size")
riskPct         = input.float(1.0, "Risk % per trade", step=0.1)
contractMult    = input.float(1.0, "Value per point (e.g., futures multiplier)")
drawWidthBars   = input.int(80, "Box width (bars)", minval=10, maxval=300)
showValues      = input.bool(true, "Show amounts text")

// ===== Derived prices
var float _entry = na
var float _sl    = na

_entry := na(entryPrice) ? close : entryPrice
_sl    := slPrice

isLong = dirLong == "Long"

// Ensure SL is on correct side; if not, autoset 1R below/above
riskPerUnit = na
riskPerUnit := isLong ? (_entry - _sl) : (_sl - _entry)
if na(_sl) or riskPerUnit <= 0
    // default 1R = 1% ATR or 2 x mintick if ATR is na
    rFallback = math.max(ta.atr(14) * 0.2, 2 * syminfo.mintick)
    _sl := isLong ? (_entry - rFallback) : (_entry + rFallback)
    riskPerUnit := isLong ? (_entry - _sl) : (_sl - _entry)

// Targets
float tp1 = na, tp2 = na, tp3 = na

if useRMultiples
    tp1 := isLong ? _entry + riskPerUnit * tpR1 : _entry - riskPerUnit * tpR1
    tp2 := isLong ? _entry + riskPerUnit * tpR2 : _entry - riskPerUnit * tpR2
    tp3 := isLong ? _entry + riskPerUnit * tpR3 : _entry - riskPerUnit * tpR3
else
    tp1 := isLong ? _entry + tpPts1 : _entry - tpPts1
    tp2 := isLong ? _entry + tpPts2 : _entry - tpPts2
    tp3 := isLong ? _entry + tpPts3 : _entry - tpPts3

// R:R (to TP3)
reward = math.abs(tp3 - _entry)
rr     = reward / riskPerUnit

// Position size suggestion (units/contracts)
riskCash   = acctSize * riskPct * 0.01
qtySuggest = riskCash / (riskPerUnit * contractMult)

// ===== Draw boxes & lines
var box bRisk  = na
var box bRew   = na
var line lEntry = na
var line lSL    = na
var line lTP1   = na
var line lTP2   = na
var line lTP3   = na
var label lblRR = na

x1 = bar_index
x2 = bar_index + drawWidthBars

// Create on first bar
if na(bRisk)
    bRisk  := box.new(x1, _entry, x2, _sl, xloc=xloc.bar_index, bgcolor=color.new(color.red, 20), border_color=color.new(color.red, 0))
    bRew   := box.new(x1, _entry, x2, tp3, xloc=xloc.bar_index, bgcolor=color.new(color.green, 20), border_color=color.new(color.green, 0))
    lEntry := line.new(x1, _entry, x2, _entry, xloc=xloc.bar_index, width=2, color=color.new(color.blue, 0))
    lSL    := line.new(x1, _sl,    x2, _sl,    xloc=xloc.bar_index, width=2, color=color.new(color.red,  0))
    lTP1   := line.new(x1, tp1,    x2, tp1,    xloc=xloc.bar_index, width=2, color=color.new(color.green,0))
    lTP2   := line.new(x1, tp2,    x2, tp2,    xloc=xloc.bar_index, width=2, color=color.new(color.green,0))
    lTP3   := line.new(x1, tp3,    x2, tp3,    xloc=xloc.bar_index, width=2, color=color.new(color.green,0))
    lblRR  := label.new(x1, _entry, "", xloc=xloc.bar_index, textcolor=color.white, style=label.style_label_left, size=size.small, color=color.new(color.teal, 10))

// Update every bar
box.set_lefttop (bRisk, x1, _entry)
box.set_rightbottom(bRisk, x2, _sl)
box.set_lefttop (bRew,  x1, _entry)
box.set_rightbottom(bRew,  x2, tp3)

line.set_xy1(lEntry, x1, _entry), line.set_xy2(lEntry, x2, _entry)
line.set_xy1(lSL,    x1, _sl),    line.set_xy2(lSL,    x2, _sl)
line.set_xy1(lTP1,   x1, tp1),    line.set_xy2(lTP1,   x2, tp1)
line.set_xy1(lTP2,   x1, tp2),    line.set_xy2(lTP2,   x2, tp2)
line.set_xy1(lTP3,   x1, tp3),    line.set_xy2(lTP3,   x2, tp3)

// Labels
fFmt(x) => str.format("{0,number,#,##0.#####}", x)

var label lblEntry = na
var label lblSL    = na
var label lblTP1   = na
var label lblTP2   = na
var label lblTP3   = na

newOrSet(ref, txt, xp, yp, col) =>
    if na(ref)
        ref := label.new(xp, yp, txt, xloc=xloc.bar_index, style=label.style_label_center, textcolor=color.white, color=col, size=size.small)
    else
        label.set_x(ref, xp), label.set_y(ref, yp), label.set_text(ref, txt), label.set_color(ref, col)
    ref

lblEntry := newOrSet(lblEntry, "ENTRY PRICE\n" + fFmt(_entry), x1, _entry, color.new(color.blue, 0))
lblSL    := newOrSet(lblSL,    "STOP LOSS PRICE\n" + fFmt(_sl), x1, _sl, color.new(color.red,  0))
lblTP1   := newOrSet(lblTP1,   "TAKE PROFIT 1\n" + fFmt(tp1), x1, tp1, color.new(color.green,0))
lblTP2   := newOrSet(lblTP2,   "TAKE PROFIT 2\n" + fFmt(tp2), x1, tp2, color.new(color.green,0))
lblTP3   := newOrSet(lblTP3,   "TAKE PROFIT 3\n" + fFmt(tp3), x1, tp3, color.new(color.green,0))

infoTxt = showValues
    ? str.format("R:R to TP3: {0:0.##}\nRisk/Unit: {1}\nAcct Risk: {2}% = {3}\nQty Suggest: {4:0.####}",
        rr, fFmt(riskPerUnit),
        riskPct, fFmt(riskCash),
        qtySuggest)
    : str.format("R:R to TP3: {0:0.##}", rr)

label.set_text(lblRR, infoTxt)
label.set_x(lblRR, x1 + 2)
label.set_y(lblRR, isLong ? (_entry + reward*0.15) : (_entry - reward*0.15))

// Optional: Plot small markers at prices (for visibility on zoomed-out charts)
plot(_entry, "Entry", color=color.new(color.blue, 0), style=plot.style_circles, display=display.none)
plot(_sl,    "SL",    color=color.new(color.red,  0), style=plot.style_circles, display=display.none)
plot(tp1,    "TP1",   color=color.new(color.green,0), style=plot.style_circles, display=display.none)
plot(tp2,    "TP2",   color=color.new(color.green,0), style=plot.style_circles, display=display.none)
plot(tp3,    "TP3",   color=color.new(color.green,0), style=plot.style_circles, display=display.none)







//Claire 