using System;
using System.IO;
using System.Runtime.InteropServices;

namespace MantraMatcher
{
    class Program
    {
        [DllImport("kernel32.dll", SetLastError = true)]
        static extern bool SetDllDirectory(string lpPathName);

        // ✅ Match ANSI (no init)
        [DllImport("MFS100Dll.dll", CallingConvention = CallingConvention.StdCall)]
        public static extern int MFS100MatchANSI(
            byte[] template1,
            int template1Len,
            byte[] template2,
            int template2Len
        );

        static int Main(string[] args)
        {
            try
            {
                // ✅ Force load DLLs from current folder
                string exeDir = AppDomain.CurrentDomain.BaseDirectory;
                SetDllDirectory(exeDir);

                if (args.Length < 2)
                {
                    Console.WriteLine("{\"success\":false,\"error\":\"Usage: MantraMatcher.exe <tpl1.ansi> <tpl2.ansi>\"}");
                    return 1;
                }

                string tpl1Path = args[0];
                string tpl2Path = args[1];

                if (!File.Exists(tpl1Path) || !File.Exists(tpl2Path))
                {
                    Console.WriteLine("{\"success\":false,\"error\":\"Template file missing\"}");
                    return 1;
                }

                byte[] tpl1 = File.ReadAllBytes(tpl1Path);
                byte[] tpl2 = File.ReadAllBytes(tpl2Path);

                int score = MFS100MatchANSI(tpl1, tpl1.Length, tpl2, tpl2.Length);

                if (score < 0)
                {
                    Console.WriteLine($"{{\"success\":false,\"error\":\"Match failed\",\"code\":{score}}}");
                    return 1;
                }

                // ✅ score range usually 0–2000
                bool matched = score >= 1200;

                Console.WriteLine($"{{\"success\":true,\"matched\":{matched.ToString().ToLower()},\"score\":{score}}}");
                return 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine("{\"success\":false,\"error\":\"" + ex.Message.Replace("\"", "") + "\"}");
                return 1;
            }
        }
    }
}
