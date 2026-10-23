# Mixage v2 : voix nettoyée et au même niveau, musique qui baisse toute seule sous la voix,
# effets sonores égalisés, puis normalisation finale en 2 passes (-14 LUFS, standard des réseaux sociaux).
import json, re, subprocess
D = '/tmp/claude-0/-home-user-Site-DWTS-/430aefea-a391-50f4-815b-32c7ab8b4af7/scratchpad/video/'
A = D + 'audio/'
DUREE = 87.2

def ff(*args):
    return subprocess.run(['ffmpeg', '-y', '-hide_banner'] + list(args), check=True, capture_output=True, text=True)

def lufs(path):
    out = ff('-i', path, '-af', 'ebur128', '-f', 'null', '-').stderr
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', out)[-1])

def crete(path):
    out = ff('-i', path, '-af', 'volumedetect', '-f', 'null', '-').stderr
    return float(re.search(r'max_volume: (-?[\d.]+) dB', out).group(1))

# 1) Nettoyage des voix : coupe-bas (souffle grave), réduction de bruit douce, dé-esseur, porte de bruit
#    entre les phrases. Puis chaque voix est mise à -16 LUFS pour que les deux parties sonnent pareil.
NETTOIE = 'highpass=f=75,afftdn=nr=12:nf=-45:tn=1,deesser=i=0.35,agate=threshold=0.008:ratio=3:attack=5:release=180'
for src, dst in [('voix-2.mp3', 'voix-propre.wav'), ('parrain-2.mp3', 'parrain-propre.wav')]:
    ff('-i', A + src, '-af', NETTOIE, '-ar', '48000', A + 'tmp.wav')
    g = -16 - lufs(A + 'tmp.wav')
    ff('-i', A + 'tmp.wav', '-af', f'volume={g:.2f}dB,alimiter=limit=0.89', A + dst)

# 2) Effets : chaque son ramené à une crête cible (en dB) pour qu'aucun ne couvre la voix.
cibles = {'whoosh': -15, 'pop': -17, 'ding': -15, 'impact': -11, 'compteur': -17}
gain_sfx = {k: v - crete(A + k + '.mp3') for k, v in cibles.items()}
sfx = {
  'whoosh': [6.15, 10.3, 21.15, 28.4, 35.4, 40.6, 45.75, 53.5, 62.1, 68.65, 75.85, 82.7],
  'pop': [0.55, 2.22, 4.0, 10.55, 13.5, 14.35, 15.2, 21.4, 23.7, 23.92, 24.14, 24.8, 25.6, 27.1, 28.6, 30.85, 33.6,
          36.3, 37.3, 38.3, 53.75, 59.55, 74.2, 74.5, 76.85, 77.4, 78.1],
  'ding': [17.15, 41.0, 42.0, 43.15, 44.25, 49.85, 61.5, 66.6, 73.0, 81.4],
  'impact': [6.3, 45.9, 82.9],
  'compteur': [63.0, 69.3, 79.3],
}

# 3) Montage audio en 3 pistes séparées (plus fiable), puis mélange
g_mus = -21 - lufs(A + 'musique-1.mp3')   # musique seule à -26 LUFS, puis baisse automatique sous la voix
ff('-i', A + 'voix-propre.wav', '-i', A + 'parrain-propre.wav', '-filter_complex',
   '[0:a]asplit=2[v0][v1];[v0]atrim=0:37.78,asetpts=PTS-STARTPTS,adelay=500:all=1[va];'
   '[v1]atrim=37.78:50.66,asetpts=PTS-STARTPTS,afade=t=out:st=12.7:d=0.18,adelay=40780:all=1[vb];'
   '[1:a]asetpts=PTS-STARTPTS,adelay=54000:all=1[vc];'
   '[va][vb][vc]amix=inputs=3:normalize=0:duration=longest,apad=pad_dur=10[o]',
   '-map', '[o]', '-t', str(DUREE), '-ar', '48000', '-ac', '2', A + 'piste-voix.wav')
ff('-i', A + 'musique-1.mp3', '-i', A + 'piste-voix.wav', '-filter_complex',
   f'[0:a]atrim=0:{DUREE},asetpts=PTS-STARTPTS,volume={g_mus:.2f}dB,afade=t=in:d=1.2,afade=t=out:st={DUREE-2:g}:d=2,aresample=48000[m];'
   '[m][1:a]sidechaincompress=threshold=0.03:ratio=6:attack=60:release=450[o]',
   '-map', '[o]', '-ar', '48000', '-ac', '2', A + 'piste-musique.wav')
entrees, f, eti, n = [], [], [], 0
for nom, temps in sfx.items():
    for t in temps:
        entrees += ['-i', A + nom + '.mp3']
        ms = int(t * 1000)
        f.append(f'[{n}:a]volume={gain_sfx[nom]:.2f}dB,aresample=48000,adelay={ms}:all=1,apad=whole_dur={DUREE}[s{n}]')
        eti.append(f'[s{n}]'); n += 1
f.append(''.join(eti) + f'amix=inputs={len(eti)}:normalize=0:duration=longest,atrim=0:{DUREE}[o]')
ff(*entrees, '-filter_complex', ';'.join(f), '-map', '[o]', '-ar', '48000', '-ac', '2', A + 'piste-effets.wav')
ff('-i', A + 'piste-voix.wav', '-i', A + 'piste-musique.wav', '-i', A + 'piste-effets.wav', '-filter_complex',
   '[0:a][1:a][2:a]amix=inputs=3:normalize=0:duration=first[o]', '-map', '[o]', A + 'mix-brut.wav')

# 4) Normalisation finale en 2 passes
m = ff('-i', A + 'mix-brut.wav', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-').stderr
j = json.loads(m[m.rindex('{'):m.rindex('}') + 1])
ln = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:"
      f"measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
ff('-i', A + 'mix-brut.wav', '-af', ln + ',aresample=48000', A + 'mix2.wav')
print('voix', lufs(A + 'voix-propre.wav'), lufs(A + 'parrain-propre.wav'), 'final', lufs(A + 'mix2.wav'), 'crête', crete(A + 'mix2.wav'))
