# Mixage : voix (avec pause de 2,5 s avant la scène 7), musique, effets sonores, puis assemblage avec la vidéo muette.
import subprocess, sys
D = '/tmp/claude-0/-home-user-Site-DWTS-/430aefea-a391-50f4-815b-32c7ab8b4af7/scratchpad/video/'
A = D + 'audio/'
MUSIQUE = A + (sys.argv[1] if len(sys.argv) > 1 else 'musique-1.mp3')
DUREE = 67
COUPE, DEBUT_B = 37.78, 40.78          # la voix reprend 3 s plus tard (pause sur la diapo des prix)

sfx = {
  'whoosh': ([6.15, 10.3, 21.15, 28.4, 35.4, 40.6, 45.75, 53.5, 63.2], 0.55),
  'pop': ([0.55, 2.22, 4.0, 10.55, 13.5, 14.35, 15.2, 21.4, 23.7, 23.92, 24.14, 24.0, 24.8, 25.6, 27.1, 28.6, 30.85, 33.6, 36.3, 37.3, 38.3, 53.75], 0.35),
  'ding': ([17.15, 41.0, 42.0, 43.15, 44.25, 49.85, 61.6], 0.35),
  'impact': ([6.3, 45.9, 63.35], 0.6),
  'compteur': ([57.85, 60.2], 0.45),
}
entrees = ['-i', A + 'voix-2.mp3', '-i', MUSIQUE]
filtres = [
  f'[0:a]atrim=0:{COUPE},asetpts=PTS-STARTPTS,volume=2.5,adelay=500|500[va]',
  f'[0:a]atrim={COUPE},asetpts=PTS-STARTPTS,volume=2.5,adelay={int(DEBUT_B*1000)}|{int(DEBUT_B*1000)}[vb]',
  # musique : basse sous la voix, plus forte pendant la pause des prix et la fin
  "[1:a]atrim=0:%d,asetpts=PTS-STARTPTS,volume='if(between(t,38.4,40.6),0.35,if(gt(t,63.2),0.4,0.12))':eval=frame,afade=t=in:d=1,afade=t=out:st=%g:d=1.4[mu]" % (DUREE, DUREE - 1.4),
]
etiquettes = ['[va]', '[vb]', '[mu]']
n = 2
for nom, (temps, vol) in sfx.items():
    for t in temps:
        entrees += ['-i', A + nom + '.mp3']
        ms = int(t * 1000)
        filtres.append(f'[{n}:a]volume={vol},adelay={ms}|{ms}[s{n}]')
        etiquettes.append(f'[s{n}]')
        n += 1
filtres.append(''.join(etiquettes) + f'amix=inputs={len(etiquettes)}:normalize=0:duration=longest,atrim=0:{DUREE},loudnorm=I=-14:TP=-1.5:LRA=11[mix]')
cmd = ['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error'] + entrees + ['-filter_complex', ';'.join(filtres), '-map', '[mix]', '-ar', '48000', '-ac', '2', A + 'mix.wav']
subprocess.run(cmd, check=True)
subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', D + 'video-muette.mp4', '-i', A + 'mix.wav',
                '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', D + 'DWTS-presentation.mp4'], check=True)
print('ok')
