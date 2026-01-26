#include <napi.h>
#include <windows.h>
#include <string>
#include <vector>

typedef int(__stdcall *InitFunc)();
typedef int(__stdcall *AutoCaptureFunc)(unsigned char* templateData, int* templateSize);

static HMODULE hDll = NULL;

Napi::Value InitDevice(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (hDll) {
    return Napi::Boolean::New(env, true);
  }

  std::string dllPath = info[0].As<Napi::String>().Utf8Value();

  hDll = LoadLibraryA(dllPath.c_str());
  if (!hDll) {
    return Napi::String::New(env, "❌ Failed to load DLL: " + dllPath);
  }

  return Napi::Boolean::New(env, true);
}

Napi::Value CaptureTemplate(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!hDll) {
    return env.Null();
  }

  // 🔥 Example exported functions
  InitFunc init = (InitFunc)GetProcAddress(hDll, "InitDevice");
  AutoCaptureFunc capture = (AutoCaptureFunc)GetProcAddress(hDll, "AutoCaptureTemplate");

  if (!init || !capture) {
    return Napi::String::New(env, "❌ Missing required DLL exports.");
  }

  init();

  unsigned char buffer[2048];
  int size = 2048;

  int res = capture(buffer, &size);

  if (res != 0 || size <= 0) {
    return Napi::String::New(env, "❌ Capture failed.");
  }

  return Napi::Buffer<unsigned char>::Copy(env, buffer, size);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("initDevice", Napi::Function::New(env, InitDevice));
  exports.Set("captureTemplate", Napi::Function::New(env, CaptureTemplate));
  return exports;
}

NODE_API_MODULE(mantraaddon, Init);
