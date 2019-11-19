using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ConsoleApp_2
{
    public class Program
    {
        static void Main(string[] args)
        {
            Class1 c = new Class1();
            double a = c.Addition(4,3);
		//test
            Console.WriteLine("Addition is: {0}",a);
            Console.Read();
        }
    }
}
