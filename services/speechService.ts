
import { SpeechServiceOptions } from '../types';

export class SpeechService {
  private recognition: any;
  private isRecording: boolean = false;

  constructor(options: SpeechServiceOptions) {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      options.onError("Web Speech API is not supported in this browser.");
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.isRecording = true;
      options.onStateChange(true);
    };

    this.recognition.onresult = (event: any) => {
      let interim = '';
      
      // Starting from resultIndex ensures we only process changed or new results
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptChunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          options.onFinal(transcriptChunk);
        } else {
          interim += transcriptChunk;
        }
      }
      
      // Always report the current accumulated interim text for the active phrase
      options.onPartial(interim);
    };

    this.recognition.onerror = (event: any) => {
      // Don't report 'no-speech' as a hard error, just stop
      if (event.error !== 'no-speech') {
        options.onError(event.error);
      }
      this.stop();
    };

    this.recognition.onend = () => {
      this.isRecording = false;
      options.onStateChange(false);
    };
  }

  start() {
    if (this.recognition && !this.isRecording) {
      try {
        this.recognition.start();
      } catch (e) {
        console.error("Failed to start recognition:", e);
      }
    }
  }

  stop() {
    if (this.recognition && this.isRecording) {
      this.recognition.stop();
    }
  }
}
