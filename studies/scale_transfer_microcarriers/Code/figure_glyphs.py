"""Flat reactor glyphs derived from the manuscript's original figures.

All coordinates are caller-controlled data coordinates. Use an equal axis aspect
for faithful proportions. Shapes are illustrative, not experimental observations.
"""
from matplotlib.patches import FancyBboxPatch, Rectangle, Ellipse, Polygon, FancyArrowPatch

PALETTE = {
    'vessel': '#D9D9D9', 'outline': '#7F7F7F',
    'liquid': '#FF99CC', 'pink': '#FF99CC', 'magenta': '#CC0066',
    'blue': '#4472C4', 'shaft': '#8FAADC', 'impeller': '#8FAADC',
    'cell': '#EFEFEF', 'black': '#000000', 'white': '#FFFFFF',
    'grid': '#E6E6E6', 'coral': '#FF7C80',
}


def reactor(ax, x, y, w, h, impellers=2, carriers=True):
    """Draw a stirred vessel; return its artists. No labels are embedded."""
    if w <= 0 or h <= 0:
        raise ValueError('Glyph width and height must be positive')
    artists = []
    def add(p):
        ax.add_patch(p)
        artists.append(p)
        return p
    body_y, body_h = y + .03*h, .83*h
    radius = min(.19*w, .12*h)
    body = add(FancyBboxPatch((x, body_y), w, body_h,
        boxstyle=f'round,pad=0,rounding_size={radius}',
        facecolor=PALETTE['vessel'], edgecolor=PALETTE['outline'],
        linewidth=1.25, zorder=2))
    # Meniscus and medium share the vessel clipping path, preserving rounded base.
    top = body_y + .66*body_h
    points = [(x, body_y), (x+w, body_y), (x+w, top)]
    points += [(x+f*w, top+offset*h) for f,offset in
               [(.90,.009),(.80,-.006),(.70,.004),(.60,-.005),
                (.50,.009),(.40,-.006),(.30,.003),(.20,-.004),(.10,.004),(0,0)]]
    medium = add(Polygon(points, closed=True, facecolor=PALETTE['liquid'],
                         edgecolor='none', zorder=3))
    medium.set_clip_path(body)
    # Fixed cells/carriers are symbolic locations, deliberately not random data.
    if carriers:
        locations = [(.16,.18),(.79,.21),(.27,.35),(.72,.40),
                     (.17,.55),(.83,.57),(.36,.12),(.62,.29)]
        for i,(fx,fy) in enumerate(locations):
            p = add(Ellipse((x+fx*w, body_y+fy*body_h), .09*w, .024*h,
                angle=(-28 if i%2 else 28), facecolor=PALETTE['cell'],
                edgecolor=PALETTE['outline'], linewidth=.45, zorder=4))
            p.set_clip_path(body)
    add(Rectangle((x+.445*w, y+.15*h), .11*w, .78*h,
                  facecolor=PALETTE['shaft'], edgecolor='none', zorder=5))
    for i in range(max(0, int(impellers))):
        cy = y + (.23 + .35*(i+.5)/max(1,int(impellers)))*h
        add(Polygon([(x+.50*w,cy), (x+.18*w,cy+.055*h),
                     (x+.14*w,cy+.015*h), (x+.25*w,cy-.035*h),
                     (x+.50*w,cy-.012*h), (x+.75*w,cy+.035*h),
                     (x+.86*w,cy-.015*h), (x+.77*w,cy-.055*h)],
                    closed=True, facecolor=PALETTE['impeller'],
                    edgecolor='none', zorder=6))
    add(FancyBboxPatch((x+.34*w,y+.91*h), .32*w,.09*h,
        boxstyle=f'round,pad=0,rounding_size={.015*w}',
        facecolor=PALETTE['shaft'], edgecolor='none', zorder=7))
    # Outline on top ensures the pink fill never hides the vessel wall.
    add(FancyBboxPatch((x,body_y), w,body_h,
        boxstyle=f'round,pad=0,rounding_size={radius}',
        facecolor='none', edgecolor=PALETTE['outline'],linewidth=1.25,zorder=8))
    return artists


def product(ax, x, y, w, h, count=4):
    """Draw a stack of finished-product bars in original Figure 4 magenta."""
    if count < 1 or w <= 0 or h <= 0:
        raise ValueError('Product count and dimensions must be positive')
    artists = []
    pitch = h/count
    for i in range(count):
        p = FancyBboxPatch((x,y+i*pitch),w,.66*pitch,
            boxstyle=f'round,pad=0,rounding_size={min(.10*w,.18*pitch)}',
            facecolor=PALETTE['magenta'],edgecolor='none',zorder=4)
        ax.add_patch(p)
        artists.append(p)
    return artists


def arrow(ax, start, end):
    """Draw a plain black process arrow in caller coordinates."""
    p = FancyArrowPatch(start,end,arrowstyle='-|>',mutation_scale=10,
        linewidth=1.05,color=PALETTE['black'],shrinkA=2,shrinkB=2,zorder=10)
    ax.add_patch(p)
    return p


def bank(ax, x, y, w, h, cols=3, rows=2):
    """Draw identical parallel vessels inside a caller-specified footprint."""
    if cols < 1 or rows < 1:
        raise ValueError('Bank rows and columns must be positive')
    artists=[]
    slot_w, slot_h = w/cols, h/rows
    # Limit vessel width so even a wide footprint retains tall vessel proportions.
    gh = .91*slot_h
    gw = min(.79*slot_w, .65*gh)
    for r in range(rows):
        for c in range(cols):
            artists.extend(reactor(ax,x+c*slot_w+(slot_w-gw)/2,
                y+r*slot_h+.025*slot_h,gw,gh,impellers=2,carriers=False))
    return artists
