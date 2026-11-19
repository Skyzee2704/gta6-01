from PIL import Image, ImageStat
import sys
for path in sys.argv[1:]:
    print(f'{ImageStat.Stat(Image.open(path).convert("L")).mean[0]/255:.6f}')
