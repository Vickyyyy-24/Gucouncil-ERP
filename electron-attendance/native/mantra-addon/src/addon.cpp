#include <napi.h>
#include <windows.h>
#include <vector>
#include <string>
#include "mantra_wrapper.h"

static MantraWrapper mantra;

// ✅ helper: convert utf8 to wide string
std::wstring toWide(const std::string& s) {
  int size_needed = MultiByteToWideChar(CP_UTF8, 0, &s[0], (int)s.size(), NULL, 0);
  std::wstring wstr(size_needed, 0);
  MultiByteToWideChar(CP_UTF8, 0, &s[0], (int)s.size(), &wstr[0], size_needed);
  return wstr;
}

// =====================================
// loadSdk(dllPath)
// =====================================
Napi::Value LoadSdk(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsString()) {
    return Napi::Boolean::New(env, false);
  }

  std::string dllPath = info[0].As<Napi::String>().Utf8Value();
  std::wstring wPath = toWide(dllPath);

  bool ok = mantra.load(wPath);
  return Napi::Boolean::New(env, ok);
}

// =====================================
// init()
// =====================================
Napi::Value Init(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  int res = mantra.init();
  return Napi::Number::New(env, res);
}

// =====================================
// capture()
// returns { success, templateBase64, templateSize }
// =====================================
Napi::Value Capture(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // template buffer
  std::vector<unsigned char> tmpl(2048);
  int tmplSize = 0;

  int quality = 60;
  if (info.Length() >= 1 && info[0].IsNumber()) {
    quality = info[0].As<Napi::Number>().Int32Value();
  }

  int res = mantra.capture(quality, tmpl.data(), &tmplSize);

  if (res != 0 || tmplSize <= 0) {
    Napi::Object fail = Napi::Object::New(env);
    fail.Set("success", false);
    fail.Set("errorCode", res);
    return fail;
  }

  // Convert template bytes → base64
  Napi::Buffer<unsigned char> buffer = Napi::Buffer<unsigned char>::Copy(env, tmpl.data(), tmplSize);

  // Use JS Buffer toBase64
  Napi::Object global = env.Global();
  Napi::Object BufferObj = global.Get("Buffer").As<Napi::Object>();
  Napi::Function fromFn = BufferObj.Get("from").As<Napi::Function>();

  Napi::Value args[1] = { buffer };
  Napi::Object buf = fromFn.Call(BufferObj, 1, args).As<Napi::Object>();

  Napi::Function toStringFn = buf.Get("toString").As<Napi::Function>();
  Napi::Value b64 = toStringFn.Call(buf, { Napi::String::New(env, "base64") });

  Napi::Object ok = Napi::Object::New(env);
  ok.Set("success", true);
  ok.Set("templateBase64", b64);
  ok.Set("templateSize", tmplSize);
  ok.Set("quality", quality);

  return ok;
}

// =====================================
// uninit()
// =====================================
Napi::Value Uninit(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  int res = mantra.uninit();
  return Napi::Number::New(env, res);
}

// =====================================
// unload()
// =====================================
Napi::Value Unload(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  mantra.unload();
  return env.Undefined();
}

// =====================================
// Module export
// =====================================
Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  exports.Set("loadSdk", Napi::Function::New(env, LoadSdk));
  exports.Set("init", Napi::Function::New(env, Init));
  exports.Set("capture", Napi::Function::New(env, Capture));
  exports.Set("uninit", Napi::Function::New(env, Uninit));
  exports.Set("unload", Napi::Function::New(env, Unload));
  return exports;
}

NODE_API_MODULE(mantraaddon, InitAll)
