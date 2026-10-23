"""Validate generated images and make a local visual-review contact sheet."""
import json
import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--kind',choices=['context','question'],default='context')
args=parser.parse_args()
questions=json.loads((ROOT/'data/questions.json').read_text(encoding='utf-8'))
assets=json.loads((ROOT/f'data/{args.kind}-image-crops.json').read_text(encoding='utf-8'))
for asset in assets:
    with Image.open(ROOT/asset['path']) as im:
        im.verify()
    assert 0 <= asset['top'] < asset['bottom'] <= 1
examples=[
    '2016_center_main_physics_a15','2016_center_main_physics_a16',
    '2014_center_main_physics1_a21','2010_center_main_physics1_a21',
    '2024_common_makeup_physics_basic_a07','2025_common_main_physics_a14',
    '2021_common_main_physics_basic_a08','2006_center_main_physics1_a21',
]
if args.kind=='question':
    examples=[
        '2019_center_main_physics_a19','2016_center_main_physics_a15',
        '2023_common_makeup_physics_a06','2025_common_main_physics_a08',
        '2023_common_main_physics_a21','2021_common_main_physics_a20',
        '2024_common_makeup_physics_basic_a07','2006_center_main_physics1_a21',
    ]
canvas=Image.new('RGB',(1600,2200),'#dfe4e1')
draw=ImageDraw.Draw(canvas)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18)
for index,id in enumerate(examples):
    q=next(q for q in questions if q['id']==id)
    # First relevant section image; a separate global-intro image is tiny.
    if args.kind=='question':
        asset=q['question_images'][-1]
    else:
        asset=next((a for a in q['context_images'] if a['bottom']-a['top']>.22),q['context_images'][-1])
    im=Image.open(ROOT/asset['path']).convert('RGB')
    im.thumbnail((776,510))
    x=(index%2)*800+12
    y=(index//2)*550+34
    draw.text((x,y-27),id,fill='black',font=font)
    canvas.paste(im,(x,y))
out=ROOT/f'data/_tmp/{args.kind}-review.jpg'
canvas.save(out,quality=88)
print(f'Validated {len(assets)} images. Contact sheet: {out}')
