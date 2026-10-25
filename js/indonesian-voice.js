(function () {
    'use strict';

    function getAvailableVoices(synthesis) {
        return new Promise(resolve => {
            let timeoutId;
            const previousHandler = synthesis.onvoiceschanged;

            function finish(voices) {
                clearTimeout(timeoutId);
                if (typeof synthesis.removeEventListener === 'function') {
                    synthesis.removeEventListener('voiceschanged', onVoicesChanged);
                } else if (synthesis.onvoiceschanged === onVoicesChanged) {
                    synthesis.onvoiceschanged = previousHandler || null;
                }
                resolve(voices);
            }

            function onVoicesChanged() {
                const voices = synthesis.getVoices();
                if (voices.length) finish(voices);
            }

            const currentVoices = synthesis.getVoices();
            if (currentVoices.length) {
                resolve(currentVoices);
                return;
            }

            if (typeof synthesis.addEventListener === 'function') {
                synthesis.addEventListener('voiceschanged', onVoicesChanged);
            } else {
                synthesis.onvoiceschanged = function () {
                    if (typeof previousHandler === 'function') previousHandler.call(synthesis);
                    onVoicesChanged();
                };
            }

            timeoutId = setTimeout(() => finish(synthesis.getVoices()), 1200);
        });
    }

    function chooseIndonesianVoice(voices) {
        return voices
            .filter(voice => /^id(?:-|$)/i.test(voice.lang))
            .map(voice => {
                const name = voice.name.toLowerCase();
                let score = 0;
                if (/natural|neural|enhanced|premium/.test(name)) score += 100;
                if (/google|indonesia/.test(name)) score += 20;
                if (/male|masculine|pria|laki/.test(name)) score += 10;
                if (voice.localService) score += 5;
                return { voice, score };
            })
            .sort((a, b) => b.score - a.score)[0]?.voice;
    }

    window.speakIndonesian = async function (text) {
        if (!('speechSynthesis' in window) ||
            typeof window.SpeechSynthesisUtterance === 'undefined') return;

        try {
            const synthesis = window.speechSynthesis;
            const voices = await getAvailableVoices(synthesis);
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'id-ID';
            utterance.rate = 0.94;
            utterance.pitch = 0.94;

            const voice = chooseIndonesianVoice(voices);
            if (voice) utterance.voice = voice;

            synthesis.cancel();
            synthesis.speak(utterance);
        } catch (error) {
            console.error('Gagal memutar ucapan suara:', error);
        }
    };
})();
