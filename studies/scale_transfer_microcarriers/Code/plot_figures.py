"""Two publication figures; deterministic scenarios, never empirical observations.
Run run_scenarios.py first. Original Figures 1–4 are untouched.
"""
from pathlib import Path
import csv,json,argparse
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle
from figure_glyphs import bank, arrow, PALETTE as C
from model import Parameters,evaluate
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'Figures'
REVIEW=False
P=Parameters(**{k:v['value'] for k,v in json.loads((ROOT/'Code/parameters.json').read_text())['parameters'].items()})
S=json.loads((ROOT/'Source_Data/model_summary.json').read_text())
plt.rcParams.update({'font.family':'sans-serif','font.sans-serif':['Arial','Liberation Sans','DejaVu Sans'],'font.size':7,'axes.labelsize':7,'axes.linewidth':.65,'xtick.labelsize':7,'ytick.labelsize':7,'svg.fonttype':'none','pdf.fonttype':42,'savefig.facecolor':'white'})

def read(name):
    with (ROOT/'Source_Data'/name).open() as f:return list(csv.DictReader(f))
def xy(rows,x,y,**where):
    rr=[r for r in rows if all(float(r[k])==v for k,v in where.items())]
    return np.array([float(r[x]) for r in rr]),np.array([float(r[y]) for r in rr])
def save(fig,name):
    OUT.mkdir(parents=True,exist_ok=True)
    for ext in ('svg','pdf','png','tiff'):
        kw={'pil_kwargs':{'compression':'tiff_lzw'}} if ext=='tiff' else {}
        fig.savefig(OUT/f'{name}.{ext}',dpi=600,**kw)
    if REVIEW:
        (ROOT/'work').mkdir(parents=True,exist_ok=True)
        fig.savefig(ROOT/'work'/f'{name}_review.png',dpi=150)
    plt.close(fig)
def axes(fig,rect,letter,title):
    ax=fig.add_axes(rect)
    for side in ('top','right'):ax.spines[side].set_visible(False)
    ax.tick_params(length=3,width=.65,pad=3)
    ax.text(-.16,1.07,letter,transform=ax.transAxes,fontweight='bold',fontsize=8)
    ax.set_title(title,loc='left',fontsize=7,pad=14)
    return ax

def carrier():
    fig=plt.figure(figsize=(180/25.4,122/25.4))
    # One compact process strip; geometry and colours follow the original figures.
    ax=fig.add_axes([.035,.72,.93,.265]);ax.set(xlim=(0,180),ylim=(0,33));ax.set_aspect('equal');ax.axis('off')
    ax.text(0,30,'a',fontweight='bold',fontsize=8)
    bank(ax,9,9,23,20,cols=3,rows=1);arrow(ax,(34,20),(47,20))
    ax.text(21,4,'Expansion',ha='center',fontsize=7)
    ax.text(57,22,'Harvest',ha='center',fontsize=7);ax.text(57,15,r'$\eta_H = 0.8$',ha='center',fontsize=7)
    arrow(ax,(69,20),(84,20))
    # Generic receiving compartment: no assumed maturation impeller or hardware.
    body=FancyBboxPatch((88,9),12,18,boxstyle='round,pad=0,rounding_size=2',facecolor=C['vessel'],edgecolor=C['outline'],lw=1.1)
    ax.add_patch(body)
    medium=Rectangle((88,9),12,11,facecolor=C['pink'],edgecolor='none')
    medium.set_clip_path(body);ax.add_patch(medium)
    ax.add_patch(FancyBboxPatch((88,9),12,18,boxstyle='round,pad=0,rounding_size=2',facecolor='none',edgecolor=C['outline'],lw=1.1))
    ax.text(94,4,'Maturation',ha='center',fontsize=7);arrow(ax,(105,20),(119,20))
    ax.text(146,23,'Accepted input-cell equivalents',ha='center',fontsize=7)
    ax.text(146,15,r'$Q_{\mathrm{accepted}}=a\,\min(\eta_H F_E,F_M,F_H)$',ha='center',fontsize=7)
    ax.text(146,5,'Annual stage-limited capacity',ha='center',fontsize=7,color='#555555')
    rows=read('loading.csv');down=read('downstream_loading.csv')
    ax=axes(fig,[.105,.14,.355,.49],'b','Endpoint inventory')
    for power,col,ls in [(2,C['shaft'],'-'),(5,C['blue'],'-'),(20,C['magenta'],'-')]:
        x,y=xy(rows,'surface_cm2_ml','Xharvest_cells_m3',pmax_W_m3=power)
        knee=next(r['AO_cm2_ml'] for r in S['oxygen_thresholds'] if r['pmax_W_m3']==power)
        if x[0] < knee < x[-1]:
            x=np.append(x,knee)
            y=np.append(y,evaluate(P,knee,pmax_W_m3=power)['Xharvest_cells_m3'])
            order=np.argsort(x);x,y=x[order],y[order]
        ax.plot(x,y/1e12,color=col,lw=1.8)
    ax.text(60,1.57,'20 W m$^{-3}$',ha='right',color=C['magenta'])
    ax.text(78,1.08,'5 W m$^{-3}$',ha='right',color=C['blue'])
    ax.text(78,.73,'2 W m$^{-3}$',ha='right',color='#526B91')
    for p,col in [(2,C['shaft']),(5,C['blue'])]:
        r=next(r for r in S['oxygen_thresholds'] if r['pmax_W_m3']==p)
        a=r['AO_cm2_ml'];ax.plot([a,a],[0,a*.02],color=col,lw=.8,ls=(0,(2,3)))
    ax.set(xlim=(10,80),ylim=(0,1.7),xticks=[10,33.1,50.9,80],yticks=[0,.4,.8,1.2,1.6],xlabel='Carrier surface (cm² mL$^{-1}$)',ylabel='Endpoint inventory ($10^6$ cells mL$^{-1}$)')
    ax=axes(fig,[.605,.14,.355,.49],'c','Recovered and accepted capacity')
    x,y=xy(rows,'surface_cm2_ml','Fafterharvest_cells_year',pmax_W_m3=5)
    ax.plot(x,y/1e15,color=C['blue'],lw=1.8,ls=(0,(4,2)))
    for ratio,col in [(1,C['magenta']),(.3,'#555555'),(.1,C['shaft'])]:
        x,y=xy(down,'surface_cm2_ml','accepted_input_cells_year',maturation_volume_ratio=ratio)
        ax.plot(x,y/1e15,color=col,lw=1.8)
    ax.text(78,2.93,'Recovered cells',ha='right',fontsize=7,color=C['blue'])
    ax.text(78,2.58,r'Accepted: $V_M/V_E=1$',ha='right',color=C['magenta'])
    ax.text(78,1.02,r'$V_M/V_E=0.3$',ha='right',color='#555555')
    ax.text(78,.43,r'$V_M/V_E=0.1$',ha='right',color='#526B91')
    ax.set(xlim=(10,80),ylim=(0,3.5),xticks=[10,40,60,80],yticks=[0,1,2,3],xlabel='Carrier surface (cm² mL$^{-1}$)',ylabel='Annual capacity ($10^{15}$ yr$^{-1}$)')
    fig.text(.105,.035,'100 m³ expansion · reference oxygen demand · panel c: 5 W m$^{-3}$',fontsize=7,color='#555555')
    save(fig,'Figure_5_Carrier_to_Capacity')

def bottleneck():
    fig=plt.figure(figsize=(180/25.4,108/25.4))
    ax=axes(fig,[.105,.19,.39,.67],'a','Stage-binding map')
    rows=read('allocation_boundary.csv');q=np.array([float(r['qO2_multiplier']) for r in rows]);r=np.array([float(r['required_maturation_volume_ratio']) for r in rows]);k=S['allocation_qcritical']
    ax.fill_between(q,.05,r,color=C['pink'],lw=0)
    ax.fill_between(q,r,1,where=q<=k,color=C['shaft'],alpha=.65,lw=0)
    ax.fill_between(q,r,1,where=q>=k,color=C['vessel'],lw=0)
    ax.plot(q,r,color=C['magenta'],lw=1.7)
    ax.plot([k,k],[r[0],1],color='white',lw=1.1)
    ax.text(.77,.86,'Surface',ha='center',fontsize=7)
    ax.text(2.2,.84,'Oxygen',ha='center',fontsize=7)
    ax.annotate('Lower upstream capacity',xy=(2.45,.46),xytext=(1.65,.64),fontsize=6.5,color='#555555',arrowprops={'arrowstyle':'-','lw':.65,'color':'#555555'})
    ax.text(1.85,.22,'Maturation',ha='center',fontsize=7)
    ax.scatter([1],[.3],s=24,color='black',zorder=5)
    ax.annotate('Base',(1,.3),xytext=(.53,.39),fontsize=7,arrowprops={'arrowstyle':'-','lw':.7})
    # Vertical arrow shows the one intervention that releases the base bottleneck.
    ax.annotate('',xy=(1,.711111),xytext=(1,.33),arrowprops={'arrowstyle':'->','color':C['magenta'],'lw':1.3})
    ax.text(.94,.62,'0.711',ha='right',fontsize=7,color=C['magenta'])
    ax.set(xlim=(.3,3),ylim=(.05,1),xticks=[.3,1,2,3],yticks=[.1,.3,.5,.7,.9],xlabel='Relative cell-specific oxygen demand',ylabel=r'Maturation / expansion volume, $V_M/V_E$')
    ax=axes(fig,[.73,.19,.23,.67],'b','Capacity interventions')
    cases=[('Base',40,5,.3),('2× surface',80,5,.3),('4× power',40,20,.3),(r'$V_M/V_E=1$',40,5,1)]
    vals=[evaluate(P,a,pmax_W_m3=p,maturation_ratio=r)['accepted_input_cells_year']/1e15 for _,a,p,r in cases]
    cols=['#777777',C['pink'],C['blue'],C['magenta']]
    for i,(v,col) in enumerate(zip(vals,cols)):
        ax.plot([0,v],[i,i],color=col,lw=3,solid_capstyle='butt');ax.scatter([v],[i],s=30,color=col,zorder=3)
        ax.text(v+.09,i,f'{v:.3f}',va='center',fontsize=7)
    ax.set(ylim=(3.6,-.6),xlim=(0,2.65),xticks=[0,1,2],yticks=range(4),yticklabels=[c[0] for c in cases],xlabel='Accepted capacity\n($10^{15}$ cell eq. yr$^{-1}$)')
    ax.spines['left'].set_visible(False);ax.tick_params(axis='y',length=0,pad=9)
    ax.text(.99,.04,f'{vals[-1]/vals[0]:.2f}× base output',transform=ax.transAxes,ha='right',color=C['magenta'],fontsize=7)
    fig.text(.105,.055,'100 m³ expansion · 40 cm² mL$^{-1}$ · 5 W m$^{-3}$ · base volume ratio 0.3',fontsize=7,color='#555555')
    save(fig,'Figure_6_Bottleneck_Allocation')

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--review',action='store_true',help='Also write 150 dpi review PNGs under work/.')
    REVIEW=parser.parse_args().review
    carrier();bottleneck()
    print('Wrote two main figures: editable SVG, vector PDF, 600 dpi PNG and TIFF.')
