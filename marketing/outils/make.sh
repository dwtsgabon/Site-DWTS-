# bash make.sh <name> <seconds> <voice.mp3> <voice_delay_ms>
set -e
n=$1; d=$2; vo=$3; dl=$4
rm -rf fr_$n && mkdir fr_$n
[ -f $n-v.mp4 ] || NODE_PATH=$(npm root -g) node render.js $n.html fr_$n 1080 1920 $d
[ -f $n-v.mp4 ] || ffmpeg -loglevel error -y -framerate 30 -i fr_$n/f%04d.png -c:v libx264 -pix_fmt yuv420p -crf 20 $n-v.mp4
python3 beat.py beat_$n.wav $d
ffmpeg -loglevel error -y -i $vo -i beat_$n.wav -filter_complex "[0]adelay=$dl|$dl,apad=whole_dur=$d,asplit[vo1][vo2];[1]volume=0.32[m];[m][vo1]sidechaincompress=threshold=0.04:ratio=6:attack=20:release=300[duck];[vo2][duck]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5[a]" -map "[a]" -ar 44100 -t $d mix_$n.m4a
ffmpeg -loglevel error -y -i $n-v.mp4 -i mix_$n.m4a -c:v copy -c:a aac -b:a 160k -t $d -movflags +faststart $n-final.mp4
rm -rf fr_$n
