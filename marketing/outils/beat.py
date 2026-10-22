# python3 beat.py <out.wav> <seconds>
import numpy as np, wave, sys
out_path=sys.argv[1]; dur=float(sys.argv[2])
sr=44100; bpm=112; beat=60/bpm; N=int(sr*(dur+1))
out=np.zeros(N); rng=np.random.default_rng(1)
def add(sig,t,g=1.0):
    i=int(t*sr)
    if i>=N: return
    j=min(N,i+len(sig)); out[i:j]+=g*sig[:j-i]
n=int(.35*sr); t=np.arange(n)/sr; kick=np.sin(2*np.pi*(50+90*np.exp(-t*30))*t)*np.exp(-t*9)
n2=int(.2*sr); clap=rng.normal(0,1,n2)*np.exp(-np.arange(n2)/sr*25)
n3=int(.06*sr); sh=np.diff(np.concatenate([[0],rng.normal(0,1,n3)*np.exp(-np.arange(n3)/sr*60)]))
chords=[[57,60,64],[53,57,60],[48,52,55],[55,59,62]]; bass=[45,41,36,43]
def note(m,length,g,shape):
    f=440*2**((m-69)/12); tt=np.arange(int(length*sr))/sr
    return (np.sin(2*np.pi*f*tt)+0.3*np.sin(4*np.pi*f*tt))*np.minimum(tt/0.02,1)*np.exp(-tt/shape)*g
step=beat/4; bar=16*step
for b in range(int(dur/bar)+2):
    t0=b*bar; c=chords[b%4]
    for s in range(16):
        ts=t0+s*step
        if s in (0,3,6,10,12): add(kick,ts,0.9)
        if s in (4,12): add(clap,ts,0.25)
        add(sh,ts,0.10 if s%2 else 0.05)
        if s in (2,6,10,14):
            for m in c: add(note(m+12,step*1.5,0.07,0.15),ts)
    add(note(bass[b%4],bar*0.9,0.35,1.0),t0); add(note(bass[b%4],step*2,0.25,0.3),t0+10*step)
    for m in c: add(note(m,bar,0.05,2.0),t0)
out=out[:int(dur*sr)]; f=int(0.8*sr); out[-f:]*=np.linspace(1,0,f); out/=np.abs(out).max()*1.1
w=wave.open(out_path,'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
w.writeframes((out*32767).astype(np.int16).tobytes()); w.close()
