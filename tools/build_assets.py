"""Copia para assets/ só as imagens que o jogo usa, a partir dos pacotes do Kenney (CC0).

Uso: python3 tools/build_assets.py CAMINHO_DOS_PACOTES
  (a pasta precisa ter furniturekit_updated/ e foodKit_v1.2/)
Os pacotes originais: https://kenney.nl/assets/furniture-kit e https://kenney.nl/assets/food-kit
"""
import os, re, sys, shutil
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1]
cfg = open(os.path.join(ROOT, 'js', 'config', 'sprites.js'), encoding='utf-8').read()
furniture = sorted(set(re.findall(r"sprite: '(\w+)'", cfg)) | set(re.findall(r"EXTRA_SPRITES = \[([^\]]*)\]", cfg)[0].replace("'", '').replace(' ', '').split(',')) - {''})
food_block = cfg[cfg.index('export const FOOD'):cfg.index('export const DIRS')]
food = sorted(set(re.findall(r": '(\w+)'", food_block)))

out_f = os.path.join(ROOT, 'assets', 'furniture')
out_d = os.path.join(ROOT, 'assets', 'food')
for d in (out_f, out_d):
    shutil.rmtree(d, ignore_errors=True)
    os.makedirs(d)

n = 0
for name in furniture:
    for dr in ('NE', 'NW', 'SE', 'SW'):
        src = os.path.join(SRC, 'furniturekit_updated', 'Isometric', f'{name}_{dr}.png')
        im = Image.open(src).convert('RGBA')
        im.save(os.path.join(out_f, f'{name}_{dr}.png'), optimize=True)
        n += 1
for name in food:
    src = os.path.join(SRC, 'foodKit_v1.2', 'Isometric', f'{name}_SW.png')
    im = Image.open(src).convert('RGBA')
    im = im.crop(im.getbbox())
    im.thumbnail((96, 96), Image.LANCZOS)
    im.save(os.path.join(out_d, f'{name}.png'), optimize=True)
    n += 1
print(f'{n} imagens copiadas ({len(furniture)} móveis, {len(food)} comidas)')
