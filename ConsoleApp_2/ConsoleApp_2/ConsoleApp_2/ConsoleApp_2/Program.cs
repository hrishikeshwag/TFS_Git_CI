﻿using System;
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
         //adding comment
	    Class1 c = new Class1();
            double a = c.Addition(2,3);
            Console.WriteLine("Addition is: {0}",a);
            Console.Read();
        }
    }
}
