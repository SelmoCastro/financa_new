#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
import math, textwrap, os

ROOT = Path('/home/selmo/Projetos/Financa_new')
OUT = ROOT / 'marketing' / 'social-posts'
LOGO = ROOT / 'frontend' / 'public' / 'logo.png'
OUT.mkdir(parents=True, exist_ok=True)

W_FEED, H_FEED = 1080, 1080
W_STORY, H_STORY = 1080, 1920

COLORS = {
    'bg1': (2, 6, 23),       # slate-950
    'bg2': (8, 47, 73),      # cyan deep
    'cyan': (8, 145, 178),
    'cyan2': (34, 211, 238),
    'green': (16, 185, 129),
    'emerald': (52, 211, 153),
    'white': (248, 250, 252),
    'muted': (148, 163, 184),
    'slate': (15, 23, 42),
    'card': (255,255,255,24),
    'border': (255,255,255,46),
    'danger': (244, 63, 94),
    'amber': (245, 158, 11),
}


def font(size, bold=False):
    candidates = [
        '/usr/share/fonts/noto/NotoSans-Bold.ttf' if bold else '/usr/share/fonts/noto/NotoSans-Regular.ttf',
        '/usr/share/fonts/TTF/NotoSans-Bold.ttf' if bold else '/usr/share/fonts/TTF/NotoSans-Regular.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/dejavu/DejaVuSans.ttf',
    ]
    for p in candidates:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def gradient(size, vertical=True):
    w,h=size
    img=Image.new('RGB', size)
    pix=img.load()
    for y in range(h):
        for x in range(w):
            t = y/h if vertical else x/w
            # radial glow influence
            cx, cy = w*0.82, h*0.12
            d = math.sqrt(((x-cx)/w)**2 + ((y-cy)/h)**2)
            glow = max(0, 1 - d*2.4)
            r = int(COLORS['bg1'][0]*(1-t)+COLORS['bg2'][0]*t + COLORS['cyan'][0]*glow*.25)
            g = int(COLORS['bg1'][1]*(1-t)+COLORS['bg2'][1]*t + COLORS['cyan'][1]*glow*.25)
            b = int(COLORS['bg1'][2]*(1-t)+COLORS['bg2'][2]*t + COLORS['cyan'][2]*glow*.25)
            pix[x,y]=(min(255,r),min(255,g),min(255,b))
    return img.convert('RGBA')


def rounded_rect(draw, xy, r, fill, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=r, fill=fill, outline=outline, width=width)


def text_center(draw, xy, text, fnt, fill, spacing=10):
    x,y,w = xy
    lines = text.split('\n')
    total = sum(draw.textbbox((0,0), line, font=fnt)[3] for line in lines) + spacing*(len(lines)-1)
    yy=y-total/2
    for line in lines:
        bb=draw.textbbox((0,0), line, font=fnt)
        tw=bb[2]-bb[0]; th=bb[3]-bb[1]
        draw.text((x+(w-tw)/2, yy), line, font=fnt, fill=fill)
        yy += th+spacing


def text_width(draw, text, fnt):
    bbox = draw.textbbox((0, 0), text, font=fnt)
    return bbox[2] - bbox[0]


def wrap_text(draw, text, fnt, max_width):
    words=text.split()
    lines=[]; cur=''
    for word in words:
        test=(cur+' '+word).strip()
        if text_width(draw, test, fnt) <= max_width:
            cur=test
        else:
            if cur: lines.append(cur)
            cur=word
    if cur: lines.append(cur)
    return '\n'.join(lines)


def paste_logo(img, x, y, size=120):
    if not LOGO.exists():
        return
    logo=Image.open(LOGO).convert('RGBA')
    try:
        resample_filter = Image.Resampling.LANCZOS  # type: ignore[attr-defined]
    except AttributeError:
        resample_filter = None
    if resample_filter is None:
        logo.thumbnail((size,size))
    else:
        logo.thumbnail((size,size), resample_filter)
    shadow=Image.new('RGBA', (logo.width+40, logo.height+40), (0,0,0,0))
    shadow_draw=ImageDraw.Draw(shadow)
    shadow_draw.ellipse((20,20,20+logo.width,20+logo.height), fill=(0,0,0,100))
    shadow=shadow.filter(ImageFilter.GaussianBlur(18))
    img.alpha_composite(shadow, (x-20,y-20))
    img.alpha_composite(logo, (x,y))


def add_brand(draw, w, h):
    draw.text((60,h-86), 'finanzaai.tech', font=font(28, True), fill=COLORS['cyan2'])
    draw.text((w-250,h-82), '@Finanza AI', font=font(24, False), fill=(148,163,184,210))


def add_button(draw, x,y,w,text, color='green'):
    fill=COLORS[color]
    rounded_rect(draw, (x,y,x+w,y+76), 38, fill=fill)
    bb=draw.textbbox((0,0), text, font=font(28, True))
    draw.text((x+(w-(bb[2]-bb[0]))/2, y+20), text, font=font(28, True), fill=(255,255,255))


def add_finance_grid(draw, w, h):
    # decorative charts/cards
    for i,(label,val,col) in enumerate([('Entradas','R$ 4.820',COLORS['green']),('Gastos','R$ 2.170',COLORS['danger']),('Guardado','R$ 920',COLORS['cyan2'])]):
        x=70+i*310; y=h-310
        rounded_rect(draw,(x,y,x+270,y+138),28,fill=(15,23,42,255),outline=(34,211,238,90),width=2)
        draw.text((x+24,y+24),label,font=font(24,False),fill=COLORS['muted'])
        draw.text((x+24,y+66),val,font=font(34,True),fill=col)
    # line chart
    pts=[]
    for i in range(9):
        x=120+i*95; y=h-410-int(math.sin(i*.9)*45)-i*8
        pts.append((x,y))
    draw.line(pts, fill=COLORS['cyan2'], width=8, joint='curve')
    for p in pts:
        draw.ellipse((p[0]-10,p[1]-10,p[0]+10,p[1]+10), fill=COLORS['emerald'])


def feed(title, subtitle, filename, badge=None, bullets=None, concept=None):
    img=gradient((W_FEED,H_FEED)); draw=ImageDraw.Draw(img,'RGBA')
    paste_logo(img, 64, 58, 110)
    if badge:
        rounded_rect(draw,(205,72,205+len(badge)*17+42,122),25,fill=(15,23,42,255),outline=COLORS['cyan2'],width=2)
        draw.text((228,83),badge,font=font(22,True),fill=COLORS['cyan2'])
    if concept:
        # large concept number
        draw.text((75,180),concept,font=font(136,True),fill=(34,211,238,42))
    title_wrapped = wrap_text(draw,title,font(70,True),900)
    draw.multiline_text((70,210 if not concept else 250), title_wrapped, font=font(70,True), fill=COLORS['white'], spacing=6)
    sub_wrapped=wrap_text(draw,subtitle,font(33,False),900)
    draw.multiline_text((74,500 if not concept else 555), sub_wrapped,font=font(33,False),fill=(203,213,225),spacing=10)
    if bullets:
        y=620
        for b in bullets:
            rounded_rect(draw,(72,y,1000,y+70),24,fill=(15,23,42,255),outline=(34,211,238,120),width=2)
            draw.text((104,y+17),'•',font=font(30,True),fill=COLORS['green'])
            draw.text((150,y+18),b,font=font(26,True),fill=COLORS['white'])
            y+=82
    else:
        add_finance_grid(draw,W_FEED,H_FEED)
    add_button(draw,70,900,420,'COMEÇAR GRÁTIS')
    add_brand(draw,W_FEED,H_FEED)
    img.convert('RGB').save(OUT/filename)


def story(title, subtitle, filename, bullets=None):
    img=gradient((W_STORY,H_STORY)); draw=ImageDraw.Draw(img,'RGBA')
    paste_logo(img, 420, 110, 240)
    draw.text((0,400),'FINANZA AI',font=font(34,True),fill=COLORS['cyan2'],anchor='ma')
    title_wrapped=wrap_text(draw,title,font(84,True),900)
    # center manually
    lines=title_wrapped.split('\n'); y=500
    for line in lines:
        bb=draw.textbbox((0,0),line,font=font(84,True)); draw.text(((W_STORY-(bb[2]-bb[0]))/2,y),line,font=font(84,True),fill=COLORS['white']); y+=96
    sub=wrap_text(draw,subtitle,font(42,False),860)
    draw.multiline_text((110,y+35),sub,font=font(42,False),fill=(203,213,225),spacing=12,align='center')
    if bullets:
        y=1120
        for b in bullets:
            rounded_rect(draw,(100,y,980,y+112),34,fill=(15,23,42,255),outline=(34,211,238,120),width=2)
            draw.text((145,y+30),'•',font=font(42,True),fill=COLORS['green'])
            draw.text((205,y+35),b,font=font(36,True),fill=COLORS['white'])
            y+=135
    else:
        add_finance_grid(draw,W_STORY,1580)
    add_button(draw,180,1670,720,'ACESSAR FINANZAAI.TECH')
    draw.text((90,1812),'Organize suas finanças com clareza.',font=font(30,False),fill=COLORS['muted'])
    draw.text((760,1812),'@Finanza AI',font=font(30,False),fill=COLORS['muted'])
    img.convert('RGB').save(OUT/filename)


def carousel(idx, title, subtitle, filename, accent='cyan2'):
    img=gradient((W_FEED,H_FEED)); draw=ImageDraw.Draw(img,'RGBA')
    rounded_rect(draw,(70,70,1010,1010),46,fill=(15,23,42,255),outline=(34,211,238,100),width=2)
    draw.text((105,105),f'{idx:02d}',font=font(58,True),fill=COLORS[accent])
    paste_logo(img, 840, 100, 110)
    tw=wrap_text(draw,title,font(64,True),820)
    draw.multiline_text((105,275),tw,font=font(64,True),fill=COLORS['white'],spacing=8)
    sw=wrap_text(draw,subtitle,font(34,False),810)
    draw.multiline_text((108,575),sw,font=font(34,False),fill=(203,213,225),spacing=12)
    add_button(draw,105,860,390,'VER NO APP')
    draw.text((750,902),'finanzaai.tech',font=font(26,True),fill=COLORS['cyan2'])
    img.convert('RGB').save(OUT/filename)

# Feed posts
feed('Você sabe para onde seu dinheiro está indo?', 'Controle entradas, gastos, metas e orçamento em um só lugar — sem planilha complicada.', 'feed-01-controle-financeiro.png', badge='POST PARA FEED', bullets=['Dashboard simples e visual','Metas e orçamentos por categoria','IA para organizar seus lançamentos'])
feed('A regra 50/30/20 no seu bolso', 'Separe necessidades, desejos e futuro de forma simples para enxergar o mês com clareza.', 'feed-02-regra-50-30-20.png', badge='EDUCAÇÃO FINANCEIRA', concept='50/30/20')
feed('Pare de descobrir o rombo só no fim do mês', 'O Finanza AI ajuda você a acompanhar o orçamento antes que ele estoure.', 'feed-03-rombo-fim-mes.png', badge='ALERTA DE ORÇAMENTO', bullets=['Alertas visuais','Categorias organizadas','Decisões antes do problema'])
feed('Finanças organizadas, sem complicar', 'Um app direto para quem quer sair do achismo e tomar controle do dinheiro.', 'feed-04-sem-complicar.png', badge='FINANZA AI', bullets=['Cadastro rápido','Visual limpo','Grátis para começar'])
feed('Do caos financeiro para o controle', 'Veja seus números, entenda seus hábitos e acompanhe sua evolução.', 'feed-05-caos-para-controle.png', badge='ANTES E DEPOIS', bullets=['Visão do mês','Relatórios claros','Metas acompanhadas'])
feed('Seu dinheiro merece um plano', 'Crie metas, acompanhe progresso e transforme intenção em ação.', 'feed-06-metas.png', badge='METAS FINANCEIRAS', bullets=['Reserva de emergência','Objetivos pessoais','Progresso visível'])

# Story posts
story('Organize seu dinheiro com IA', 'Controle financeiro simples para você entender o mês e planejar melhor.', 'story-01-organize-com-ia.png', bullets=['Entradas e gastos','Metas e orçamento','Relatórios simples'])
story('Ainda usa planilha para tudo?', 'Teste uma forma mais leve de acompanhar sua vida financeira.', 'story-02-sem-planilha.png', bullets=['Menos bagunça','Mais clareza','Acesse pelo celular'])
story('Seu orçamento está no controle?', 'Veja categorias, limites e progresso antes do mês acabar.', 'story-03-orcamento.png', bullets=['Limites por categoria','Alertas visuais','Decisões rápidas'])
story('Comece grátis hoje', 'Finanza AI: simples, visual e feito para organizar sua rotina financeira.', 'story-04-comece-gratis.png', bullets=['Cadastro rápido','Sem planilha','finanzaai.tech'])

# Carousel
carousel(1,'3 sinais de que você precisa organizar suas finanças','Você não sabe quanto gastou, evita olhar o extrato e só percebe o problema no fim do mês.','carrossel-01-sinais.png')
carousel(2,'O problema não é só gastar','É não enxergar para onde o dinheiro está indo. O primeiro passo é clareza.','carrossel-02-clareza.png','green')
carousel(3,'Comece com categorias simples','Moradia, alimentação, transporte, lazer e futuro. Depois ajuste conforme sua rotina.','carrossel-03-categorias.png')
carousel(4,'Transforme intenção em meta','Reserva, viagem, quitar dívida ou comprar algo importante: acompanhe o progresso.','carrossel-04-metas.png','green')
carousel(5,'Teste o Finanza AI','Organize gastos, orçamento e metas em uma experiência simples e visual.','carrossel-05-cta.png')

print(f'Geradas {len(list(OUT.glob("*.png")))} imagens em {OUT}')
