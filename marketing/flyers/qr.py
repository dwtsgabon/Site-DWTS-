# python3 qr.py CODE [CODE ...]  -> qr-CODE.svg : ouvre WhatsApp DWTS avec « Bonjour DEX, j'ai vu l'affiche (CODE) »
# Un code par établissement (ex. LYC-A) pour savoir d'où viennent les clients.
import sys, urllib.parse, qrcode, qrcode.image.svg
for code in sys.argv[1:] or ['GEN']:
    msg = f"Bonjour DEX, j'ai vu l'affiche ({code}). Je voudrais commander."
    url = 'https://wa.me/24162671445?text=' + urllib.parse.quote(msg)
    q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=2, box_size=10)
    q.add_data(url); q.make(fit=True)
    q.make_image(image_factory=qrcode.image.svg.SvgPathImage).save(f'qr-{code}.svg')
    print(code, url)
