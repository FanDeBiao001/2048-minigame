from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
root = Path(__file__).resolve().parent.parent
scale=3
im=Image.new('RGB',(600*scale,600*scale),'#385a3b');d=ImageDraw.Draw(im)
def rect(bounds,color,r=0):
    b=tuple(int(v*scale) for v in bounds)
    if r:d.rounded_rectangle(b,int(r*scale),fill=color)
    else:d.rectangle(b,fill=color)
def label(s,xy,size,color):
    font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf',size*scale)
    d.text((xy[0]*scale,xy[1]*scale),s,font=font,fill=color,anchor='mm')
rect((46,46,554,554),'#cbd4bf',40)
rect((65,65,290,290),'#ede9df',22);label('2',(177,184),120,'#546044')
rect((310,65,535,290),'#a9ca89',22);label('4',(422,184),120,'#35582d')
rect((65,310,535,535),'#edc777',22);label('2048',(300,430),143,'#5a4526')
im.resize((600,600),Image.Resampling.LANCZOS).save(root/'assets/icon-600.png')
print(root/'assets/icon-600.png')
