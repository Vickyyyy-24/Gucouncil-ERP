#pragma once
#include <windows.h>
#include <string>

// 🔥 Types for function pointers (Your DLL exports must match)
typedef int(__stdcall* FP_Init)();
typedef int(__stdcall* FP_Uninit)();
typedef int(__stdcall* FP_CaptureFinger)(int quality, unsigned char* templateData, int* templateSize);

// ✅ Wrapper class
class MantraWrapper {
public:
  MantraWrapper() : hDll(NULL), fpInit(NULL), fpUninit(NULL), fpCapture(NULL) {}

  bool load(const std::wstring& dllPath) {
    if (hDll) return true;

    hDll = LoadLibraryW(dllPath.c_str());
    if (!hDll) return false;

    // ✅ bind functions here (function names depend on your DLL exports)
    fpInit = (FP_Init)GetProcAddress(hDll, "Init");
    fpUninit = (FP_Uninit)GetProcAddress(hDll, "Uninit");
    fpCapture = (FP_CaptureFinger)GetProcAddress(hDll, "CaptureFinger");

    // If any required function missing → fail
    if (!fpInit || !fpUninit || !fpCapture) {
      FreeLibrary(hDll);
      hDll = NULL;
      return false;
    }

    return true;
  }

  int init() {
    if (!fpInit) return -999;
    return fpInit();
  }

  int uninit() {
    if (!fpUninit) return -999;
    return fpUninit();
  }

  int capture(int quality, unsigned char* outTemplate, int* outSize) {
    if (!fpCapture) return -999;
    return fpCapture(quality, outTemplate, outSize);
  }

  void unload() {
    if (hDll) {
      FreeLibrary(hDll);
      hDll = NULL;
    }
  }

private:
  HMODULE hDll;
  FP_Init fpInit;
  FP_Uninit fpUninit;
  FP_CaptureFinger fpCapture;
};
