"""Plot Figures 5 and 6 from deterministic scenarios.

Run run_scenarios.py first to regenerate the source tables. References to a
binding stage are conditional on the stated model inputs. Figures 1–4 are untouched.
"""
import argparse
import csv
import json
from pathlib import Path

import matplotlib
import numpy as np

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch, Rectangle

from figure_glyphs import bank
from model import Parameters, evaluate

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "Figures"
P = Parameters(
    **{
        name: entry["value"]
        for name, entry in json.loads(
            (ROOT / "Code/parameters.json").read_text()
        )["parameters"].items()
    }
)
S = json.loads((ROOT / "Source_Data/model_summary.json").read_text())

INK = "#202830"
SLATE = "#53606C"
GUIDE = "#89929D"
SURFACE = "#8B581C"
OXYGEN = "#176D6D"
MATURATION = "#454D87"
SURFACE_FILL = "#F4EADC"
OXYGEN_FILL = "#DFEDEC"
MATURATION_FILL = "#E9ECF6"

plt.rcParams.update(
    {
        "font.family": "sans-serif",
        "font.sans-serif": ["Arial", "Liberation Sans", "DejaVu Sans"],
        "font.size": 7,
        "mathtext.fontset": "custom",
        "mathtext.rm": "sans",
        "mathtext.it": "sans:italic",
        "mathtext.bf": "sans:bold",
        "text.color": INK,
        "axes.labelcolor": INK,
        "axes.edgecolor": SLATE,
        "axes.linewidth": 0.65,
        "xtick.color": SLATE,
        "ytick.color": SLATE,
        "xtick.labelcolor": INK,
        "ytick.labelcolor": INK,
        "svg.fonttype": "none",
        "pdf.fonttype": 42,
        "savefig.facecolor": "white",
    }
)


def read(name):
    with (ROOT / "Source_Data" / name).open(newline="") as source:
        return list(csv.DictReader(source))


def xy(rows, x_key, y_key, **where):
    selected = [
        row for row in rows
        if all(float(row[key]) == value for key, value in where.items())
    ]
    return (
        np.array([float(row[x_key]) for row in selected]),
        np.array([float(row[y_key]) for row in selected]),
    )


def save(fig, name, review):
    OUT.mkdir(parents=True, exist_ok=True)
    for extension in ("svg", "pdf", "png", "tiff"):
        options = {"pil_kwargs": {"compression": "tiff_lzw"}} if extension == "tiff" else {}
        fig.savefig(OUT / f"{name}.{extension}", dpi=600, **options)
    if review:
        work = ROOT / "work"
        work.mkdir(parents=True, exist_ok=True)
        fig.savefig(work / f"{name}_review.png", dpi=150)
    plt.close(fig)


def heading(fig, x, y, letter, title):
    fig.text(x, y, letter, fontweight="bold", fontsize=9, va="baseline")
    fig.text(x + 0.038, y, title, fontweight="bold", fontsize=8, va="baseline")


def axes(fig, rect):
    ax = fig.add_axes(rect)
    ax.spines[["top", "right"]].set_visible(False)
    ax.tick_params(length=2.7, width=0.65, pad=3)
    return ax


def flow_arrow(ax, start, end, color=SLATE, size=8):
    ax.add_patch(FancyArrowPatch(
        start, end, arrowstyle="-|>", mutation_scale=size, linewidth=0.9,
        color=color, shrinkA=0, shrinkB=0, zorder=8,
    ))


def stage_chain(fig):
    heading(fig, 0.032, 0.943, "a", "From expansion to accepted capacity")
    ax = fig.add_axes([0.080, 0.646, 0.894, 0.258])
    ax.set(xlim=(0, 165), ylim=(0, 28))
    ax.set_aspect("equal", adjustable="box")
    ax.axis("off")

    # Recolour the pre-existing illustrative vessel geometry locally.
    for artist in bank(ax, 2, 8, 27, 18, cols=3, rows=1):
        layer = artist.get_zorder()
        if layer == 2:
            artist.set(facecolor="#F5F6F8", edgecolor=SLATE, linewidth=0.75)
        elif layer == 3:
            artist.set_facecolor(SURFACE_FILL)
        elif layer == 8:
            artist.set(edgecolor=SLATE, linewidth=0.75)
        else:
            artist.set_facecolor(SLATE)

    ax.text(15.5, 3, "Expansion", ha="center", fontweight="bold")
    flow_arrow(ax, (31, 16.5), (43, 16.5))
    ax.text(54, 17.2, rf"$\eta_H = {P.harvest_recovery:g}$", ha="center", va="center")
    ax.text(54, 3, "Harvest", ha="center", fontweight="bold")
    flow_arrow(ax, (65, 16.5), (77, 16.5))

    # Generic receiving compartment with no assumed maturation hardware.
    body = FancyBboxPatch(
        (83, 9), 16, 15, boxstyle="round,pad=0,rounding_size=1.6",
        facecolor="#F7F8FB", edgecolor="none",
    )
    ax.add_patch(body)
    medium = Rectangle((83, 9), 16, 8, facecolor=MATURATION_FILL, edgecolor="none")
    medium.set_clip_path(body)
    ax.add_patch(medium)
    ax.add_patch(FancyBboxPatch(
        (83, 9), 16, 15, boxstyle="round,pad=0,rounding_size=1.6",
        facecolor="none", edgecolor=MATURATION, linewidth=0.85,
    ))
    ax.text(91, 3, "Maturation", ha="center", fontweight="bold")
    flow_arrow(ax, (105, 16.5), (117, 16.5))
    ax.text(143, 17.2, r"$Q_{\mathrm{accepted}} = a\,\min(\eta_H F_E,F_M,F_H)$", ha="center", va="center")
    ax.text(143, 3, "Accepted input-cell equivalents", ha="center", fontweight="bold")


def endpoint_inventory(ax, rows):
    # The 20 W/m³ curve stays surface limited throughout the displayed domain.
    # The lower power envelopes coincide with it until their exact oxygen knees.
    surface, endpoint = xy(rows, "surface_cm2_ml", "Xharvest_cells_m3", pmax_W_m3=20)
    ax.plot(surface, endpoint / 1e12, color=SURFACE, lw=1.65, solid_capstyle="round")
    knees = []
    for power, pattern in ((2, (0, (2, 1.8))), (5, "-")):
        surface, endpoint = xy(rows, "surface_cm2_ml", "Xharvest_cells_m3", pmax_W_m3=power)
        knee = next(
            row["AO_cm2_ml"] for row in S["oxygen_thresholds"]
            if row["pmax_W_m3"] == power
        )
        knees.append(knee)
        knee_y = evaluate(P, knee, pmax_W_m3=power)["Xharvest_cells_m3"] / 1e12
        beyond = surface > knee
        ax.plot(
            np.r_[knee, surface[beyond]], np.r_[knee_y, endpoint[beyond] / 1e12],
            color=OXYGEN, lw=1.55, ls=pattern, zorder=3,
        )
        ax.vlines(knee, 0, knee_y, colors=GUIDE, linewidth=0.72, linestyles=(0, (1.2, 2.3)))
        ax.text(78.5, knee_y + 0.071, f"{power} W m$^{{-3}}$", ha="right")
    ax.text(78.5, 1.59, r"20 W m$^{-3}$", ha="right", va="bottom")
    ax.annotate(
        "Shared surface branch", xy=(24, 0.48), xytext=(13, 1.17), color=INK,
        arrowprops={"arrowstyle": "-", "color": GUIDE, "lw": 0.65, "shrinkB": 3},
    )
    ax.set(
        xlim=(10, 80), ylim=(0, 1.76), xticks=[10, *knees, 80],
        xticklabels=["10", *(f"{knee:.1f}" for knee in knees), "80"], yticks=[0, 0.4, 0.8, 1.2, 1.6],
        xlabel=r"Carrier surface (cm$^2$ mL$^{-1}$)",
        ylabel=r"Endpoint inventory ($10^6$ cells mL$^{-1}$)",
    )


def annual_capacity(ax, loading, downstream):
    surface, recovered = xy(loading, "surface_cm2_ml", "Fafterharvest_cells_year", pmax_W_m3=5)
    ax.plot(surface, recovered / 1e15, color=SLATE, lw=1.4, ls=(0, (3.8, 2.2)))
    ax.text(78.5, recovered[-1] / 1e15 + 0.15, "Recovered cells", ha="right")
    for ratio in (1, 0.3, 0.1):
        surface, accepted = xy(
            downstream, "surface_cm2_ml", "accepted_input_cells_year",
            maturation_volume_ratio=ratio,
        )
        ax.plot(surface, accepted / 1e15, color=MATURATION, lw=1.5, solid_capstyle="round")
        label = rf"Accepted, $V_M/V_E={ratio:g}$" if ratio == 1 else rf"$V_M/V_E={ratio:g}$"
        # Place the upper accepted label below its plateau to clear the recovered line.
        offset = -0.2 if ratio == 1 else 0.13
        ax.text(78.5, accepted[-1] / 1e15 + offset, label, ha="right")
    ax.set(
        xlim=(10, 80), ylim=(0, 3.48), xticks=[10, 30, 50, 70, 80], yticks=[0, 1, 2, 3],
        xlabel=r"Carrier surface (cm$^2$ mL$^{-1}$)",
        ylabel=r"Annual capacity ($10^{15}$ yr$^{-1}$)",
    )


def carrier(review):
    fig = plt.figure(figsize=(180 / 25.4, 122 / 25.4))
    stage_chain(fig)
    loading = read("loading.csv")
    downstream = read("downstream_loading.csv")
    heading(fig, 0.032, 0.594, "b", "Expansion endpoint inventory")
    heading(fig, 0.527, 0.594, "c", "Recovered and accepted capacity")
    endpoint_inventory(axes(fig, [0.101, 0.142, 0.375, 0.397]), loading)
    annual_capacity(axes(fig, [0.602, 0.142, 0.366, 0.397]), loading, downstream)
    fig.text(
        0.101, 0.028,
        r"100 m$^3$ expansion  ·  Reference oxygen demand  ·  Panel c at 5 W m$^{-3}$",
        color=SLATE,
    )
    save(fig, "Figure_5_Carrier_to_Capacity", review)


def stage_map(ax):
    q, required = xy(
        read("allocation_boundary.csv"),
        "qO2_multiplier", "required_maturation_volume_ratio",
    )
    switch = S["allocation_qcritical"]
    switch_ratio = float(np.interp(switch, q, required))
    base_q, base_ratio = 1, 0.3
    matching_ratio = float(np.interp(base_q, q, required))

    ax.fill_between(q, 0.05, required, color=MATURATION_FILL, linewidth=0)
    ax.fill_between(q, required, 1, where=q <= switch, color=SURFACE_FILL, linewidth=0)
    ax.fill_between(q, required, 1, where=q >= switch, color=OXYGEN_FILL, linewidth=0)
    ax.plot(q, required, color=SLATE, lw=1.25)
    ax.vlines(switch, switch_ratio, 1, color=GUIDE, lw=0.8, ls=(0, (2, 2)))

    ax.text(0.78, 0.856, "Surface", ha="center", fontweight="bold")
    ax.text(2.21, 0.856, "Oxygen", ha="center", fontweight="bold")
    ax.text(2.12, 0.212, "Maturation", ha="center", fontweight="bold")

    ax.vlines(base_q, 0.05, base_ratio, color=GUIDE, lw=0.7, ls=(0, (2, 2)))
    ax.hlines(base_ratio, 0.3, base_q, color=GUIDE, lw=0.7, ls=(0, (2, 2)))
    ax.text(0.385, 0.332, "Base (1, 0.3)", color=INK)
    flow_arrow(ax, (base_q, base_ratio), (base_q, matching_ratio), color=MATURATION, size=7)
    ax.text(0.94, matching_ratio - 0.05, f"{matching_ratio:.3f}", ha="right", va="top")

    ax.set(
        xlim=(0.3, 3), ylim=(0.05, 1), xticks=[0.3, 1, 2, 3],
        yticks=[0.1, 0.3, 0.5, 0.7, 0.9],
        xlabel="Relative cell-specific oxygen demand",
        ylabel=r"Maturation / expansion volume, $V_M/V_E$",
    )
    # Show the surface–oxygen switch on its guideline without adding a crowded axis tick.
    ax.text(
        switch + 0.055, 0.985, f"{switch:.2f}", va="top", ha="left",
        color=INK, fontsize=6.7,
    )


def intervention_capacity(ax):
    cases = [
        ("Base", 40, 5, 0.3),
        ("2× carrier surface", 80, 5, 0.3),
        ("4× power-density limit", 40, 20, 0.3),
        (r"Maturation ratio $=1$", 40, 5, 1),
    ]
    capacities = np.array([
        evaluate(P, surface, pmax_W_m3=power, maturation_ratio=ratio)[
            "accepted_input_cells_year"
        ] / 1e15
        for _, surface, power, ratio in cases
    ])
    base = capacities[0]
    rows = [3, 2, 1, 0]
    ax.barh(rows, capacities, height=0.29, color=SLATE, zorder=3)
    ax.barh(0, capacities[-1] - base, left=base, height=0.29, color=MATURATION, zorder=4)
    ax.vlines(base, -0.52, 3.48, color=GUIDE, lw=0.7, ls=(0, (2, 2)), zorder=1)
    for y, capacity in zip(rows, capacities):
        ax.text(capacity + 0.065, y, f"{capacity:.3f}", va="center")
    ax.annotate(
        "", xy=(capacities[-1], -0.52), xytext=(base, -0.52),
        arrowprops={
            "arrowstyle": "|-|", "color": MATURATION, "linewidth": 0.75,
            "shrinkA": 0, "shrinkB": 0, "mutation_scale": 6,
        },
    )
    ax.text(
        (base + capacities[-1]) / 2, -0.72,
        f"+{capacities[-1] - base:.3f}  /  {capacities[-1] / base:.2f}×",
        ha="center", va="top",
    )
    ax.set(
        xlim=(0, 2.63), ylim=(-1.15, 3.48), xticks=[0, 1, 2], yticks=rows,
        yticklabels=[case[0] for case in cases],
        xlabel=r"Accepted capacity ($10^{15}$ cell eq. yr$^{-1}$)",
    )
    ax.tick_params(axis="y", length=0, pad=6)


def bottleneck(review):
    fig = plt.figure(figsize=(180 / 25.4, 108 / 25.4))
    heading(fig, 0.032, 0.935, "a", "Binding stage")
    heading(fig, 0.540, 0.935, "b", "Capacity under individual interventions")
    stage_map(axes(fig, [0.101, 0.176, 0.393, 0.671]))
    intervention_capacity(axes(fig, [0.728, 0.176, 0.240, 0.671]))
    fig.text(
        0.101, 0.032,
        r"Base: 100 m$^3$ expansion  ·  40 cm$^2$ mL$^{-1}$  ·  5 W m$^{-3}$  ·  $V_M/V_E=0.3$",
        color=SLATE,
    )
    save(fig, "Figure_6_Bottleneck_Allocation", review)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--review", action="store_true", help="Also write 150 dpi review PNGs under work/.")
    args = parser.parse_args()
    carrier(args.review)
    bottleneck(args.review)
    print("Wrote Figures 5 and 6 as editable SVG, vector PDF, 600 dpi PNG and TIFF.")
