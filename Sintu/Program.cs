using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Sintu
{
    public class Program
    {
        public int mul(int a, int b)
        {
            return a*b;
        }
        static void Main(string[] args)
        {
            int Number1, Number2;
            Console.WriteLine("please enter the Number1");
            Number1 = Convert.ToInt32(Console.ReadLine());
            Console.WriteLine("please enter the Number2");
            Number2 = Convert.ToInt32(Console.ReadLine());
            Program p = new Program();
            int Result;
            Result = p.mul(Number1, Number2);
            Console.WriteLine("Sum of two Numbers:" + Result.ToString());
            Console.ReadLine();
        }
    }
}
